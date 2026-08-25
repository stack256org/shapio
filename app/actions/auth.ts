"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { userExistsByEmail } from "@/lib/users/registration";

export interface ForgotPasswordState {
  error?: string;
  success?: string;
}

const emailSchema = z.email();

// Best-effort per-address cooldown so a double-click or a slow retry cannot
// queue a second reset email while the first is still in flight. HONEST
// LIMITATION: per-instance, in-memory only (mirrors the guest-OTP send
// budget in lib/portal/verification.ts) — it raises the cost of accidental
// duplicate sends but is not a distributed rate limiter.
const RESEND_COOLDOWN_MS = 60 * 1000;
const lastRequestAt = new Map<string, number>();

function pruneLastRequestAt(): void {
  const cutoff = Date.now() - RESEND_COOLDOWN_MS;
  for (const [email, at] of lastRequestAt) {
    if (at < cutoff) {
      lastRequestAt.delete(email);
    }
  }
}

/**
 * Request a password reset link.
 *
 * Better Auth's default endpoint always reports success, regardless of
 * whether the address exists, to avoid leaking account existence. This
 * instance overrides that: there is no self-serve sign-up (see
 * lib/users/registration.ts), so every real address was already provisioned
 * by an admin invite or the setup wizard, and telling someone "no account
 * exists for that email" costs nothing an attacker couldn't already learn
 * from the sign-in form's own behavior — while saving a legitimate user from
 * waiting on an email that was never coming.
 */
export async function forgotPasswordAction(
  _state: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { error: "Enter your email address." };
  }
  if (!emailSchema.safeParse(email).success) {
    return { error: "Enter a valid email address." };
  }

  pruneLastRequestAt();
  const lastAt = lastRequestAt.get(email);
  if (lastAt && Date.now() - lastAt < RESEND_COOLDOWN_MS) {
    return {
      error:
        "A reset link was already sent. Please wait a minute before requesting another.",
    };
  }

  if (!(await userExistsByEmail(email))) {
    return { error: "No account found with this email address." };
  }

  lastRequestAt.set(email, Date.now());

  await auth.api.requestPasswordReset({
    body: { email, redirectTo: "/reset-password" },
  });

  return {
    success: `We sent a password reset link to ${email}. Check your inbox and spam folder — the link expires in 1 hour.`,
  };
}

export async function logoutAction() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  await auth.api.signOut({ headers: requestHeaders });

  // Explicitly delete the session cookie so the browser does not retain it
  // after this server action (Set-Cookie from auth.api.signOut is not
  // automatically forwarded to the response in a Next.js server action context).
  const cookieStore = await cookies();
  cookieStore.delete("better-auth.session_token");

  if (session) {
    await audit({
      action: "auth.logout",
      actorEmail: session.user.email,
      actorId: session.user.id,
      description: `User logged out: ${session.user.email}`,
      entityId: session.user.id,
      entityType: "user",
    });
  }

  redirect("/signin");
}
