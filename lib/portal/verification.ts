import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  GUEST_NAME_MAX,
  GUEST_OTP_EXPIRY_MINUTES,
  GUEST_OTP_LENGTH,
  GUEST_OTP_MAX_ATTEMPTS,
  GUEST_OTP_RESEND_COOLDOWN_SECONDS,
} from "@/config/platform";
import { portalVerifications } from "@/db/schema";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { enqueueEmail } from "@/lib/email";
import { verifyEmailOtpTemplate } from "@/lib/email/templates/verify-email-otp";
import { env } from "@/lib/env";

// Email-ownership verification for accountless Public Portal visitors. This is
// deliberately NOT Better Auth's emailOTP plugin: that one mints a user record
// and a session on success. Here, success only proves control of the address —
// the caller then writes a signed identity cookie (lib/portal/guest-identity.ts)
// and no account ever exists.

export const sendOtpSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export const verifyOtpSchema = z.object({
  code: z
    .string()
    .regex(
      new RegExp(`^\\d{${GUEST_OTP_LENGTH}}$`),
      `Enter the ${GUEST_OTP_LENGTH}-digit code.`
    ),
  email: z.email("Enter a valid email address."),
  name: z.string().max(GUEST_NAME_MAX).optional(),
});

export type SendOtpResult =
  | { ok: true }
  | { error: string; ok: false; retryAfterSeconds?: number };

export type VerifyOtpResult =
  | { data: { email: string; name: string | null }; ok: true }
  | { error: string; ok: false };

/** Addresses are matched case-insensitively; store one canonical form. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Only the digest is ever persisted, so a database leak yields no usable code.
 * Keyed with APP_SECRET so a leaked digest cannot be brute-forced offline
 * against the tiny 6-digit space without also holding the secret.
 */
function hashCode(email: string, code: string): string {
  return createHash("sha256")
    .update(`${env.APP_SECRET}:${email}:${code}`)
    .digest("base64url");
}

function generateCode(): string {
  const max = 10 ** GUEST_OTP_LENGTH;
  return String(randomInt(0, max)).padStart(GUEST_OTP_LENGTH, "0");
}

// Best-effort per-IP send ceiling. HONEST LIMITATION: this lives in process
// memory, so it is per-instance only and resets on restart — it raises the cost
// of casual abuse but is not a real distributed rate limiter. The durable
// controls are the per-address ones enforced off the DB row below (resend
// cooldown + attempt ceiling), which hold across restarts and instances.
const IP_WINDOW_MS = 60 * 60 * 1000;
const IP_MAX_SENDS_PER_WINDOW = 20;
const ipSends = new Map<string, { count: number; windowStart: number }>();

function checkIpBudget(ip: string | null): boolean {
  if (!ip) {
    return true;
  }
  const now = Date.now();
  const entry = ipSends.get(ip);
  if (!entry || now - entry.windowStart > IP_WINDOW_MS) {
    ipSends.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= IP_MAX_SENDS_PER_WINDOW) {
    return false;
  }
  entry.count += 1;
  return true;
}

// Unbounded growth guard for the map above — evict stale windows opportunistically.
function pruneIpBudget(): void {
  const now = Date.now();
  for (const [ip, entry] of ipSends) {
    if (now - entry.windowStart > IP_WINDOW_MS) {
      ipSends.delete(ip);
    }
  }
}

export async function sendGuestOtp(
  rawEmail: string,
  options: { ip?: string | null; workspaceName?: string } = {}
): Promise<SendOtpResult> {
  const email = normalizeEmail(rawEmail);

  pruneIpBudget();
  if (!checkIpBudget(options.ip ?? null)) {
    return {
      error: "Too many codes requested. Please try again later.",
      ok: false,
    };
  }

  const [existing] = await db
    .select({ lastSentAt: portalVerifications.lastSentAt })
    .from(portalVerifications)
    .where(eq(portalVerifications.email, email))
    .limit(1);

  if (existing) {
    const elapsedSeconds = (Date.now() - existing.lastSentAt.getTime()) / 1000;
    if (elapsedSeconds < GUEST_OTP_RESEND_COOLDOWN_SECONDS) {
      const retryAfterSeconds = Math.ceil(
        GUEST_OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds
      );
      return {
        error: `Please wait ${retryAfterSeconds}s before requesting another code.`,
        ok: false,
        retryAfterSeconds,
      };
    }
  }

  const code = generateCode();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + GUEST_OTP_EXPIRY_MINUTES * 60 * 1000
  );

  // One live code per address: a resend rotates the row and resets the attempt
  // counter, so an earlier code stops working the moment a new one is sent.
  await db
    .insert(portalVerifications)
    .values({
      codeHash: hashCode(email, code),
      email,
      expiresAt,
      lastSentAt: now,
    })
    .onConflictDoUpdate({
      target: portalVerifications.email,
      set: {
        attemptCount: 0,
        codeHash: hashCode(email, code),
        expiresAt,
        lastSentAt: now,
      },
    });

  // Never log the recipient or the code in production (PII + a live
  // credential) — same rule as lib/auth.ts. The dev log makes local testing
  // possible without SMTP configured.
  if (env.NODE_ENV !== "production") {
    console.log(`[portal-otp] recipient=${email} code=${code}`);
  }

  const { html, text } = await verifyEmailOtpTemplate({
    email,
    otp: code,
    workspaceName: options.workspaceName,
  });

  await enqueueEmail({
    to: email,
    subject: `Your verification code: ${code}`,
    html,
    text,
  });

  audit({
    action: "portal.otp_sent",
    actorEmail: email,
    description: `Portal verification code sent to ${email}`,
    entityType: "portal_verification",
    // Metadata carries the address only — never the code.
    metadata: { email },
  });

  return { ok: true };
}

export async function verifyGuestOtp(
  rawEmail: string,
  code: string,
  name?: string
): Promise<VerifyOtpResult> {
  const email = normalizeEmail(rawEmail);
  const expected = hashCode(email, code);

  // Row-locked so two concurrent submissions cannot both consume the same code
  // or race the attempt counter — mirrors the invite-link consumption pattern
  // in lib/workspaces/invite-links.ts.
  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(portalVerifications)
      .where(eq(portalVerifications.email, email))
      .limit(1)
      .for("update");

    if (!row) {
      return {
        error: "That code has expired. Request a new one.",
        ok: false as const,
      };
    }

    if (row.expiresAt.getTime() < Date.now()) {
      await tx
        .delete(portalVerifications)
        .where(eq(portalVerifications.id, row.id));
      return {
        error: "That code has expired. Request a new one.",
        ok: false as const,
      };
    }

    const provided = Buffer.from(expected);
    const stored = Buffer.from(row.codeHash);
    const matches =
      provided.length === stored.length && timingSafeEqual(provided, stored);

    if (!matches) {
      const attemptCount = row.attemptCount + 1;
      if (attemptCount >= GUEST_OTP_MAX_ATTEMPTS) {
        // Burn the challenge rather than leaving it open to further guesses.
        await tx
          .delete(portalVerifications)
          .where(eq(portalVerifications.id, row.id));
        return {
          error: "Too many incorrect attempts. Request a new code.",
          ok: false as const,
        };
      }
      await tx
        .update(portalVerifications)
        .set({ attemptCount })
        .where(eq(portalVerifications.id, row.id));
      return {
        error: "That code is not correct. Please try again.",
        ok: false as const,
      };
    }

    // Single use — consumed on success.
    await tx
      .delete(portalVerifications)
      .where(eq(portalVerifications.id, row.id));
    return { ok: true as const };
  });

  if (!result.ok) {
    return result;
  }

  const trimmedName = name?.trim();

  audit({
    action: "portal.otp_verified",
    actorEmail: email,
    description: `Portal email verified: ${email}`,
    entityType: "portal_verification",
    metadata: { email },
  });

  return {
    data: { email, name: trimmedName || null },
    ok: true,
  };
}
