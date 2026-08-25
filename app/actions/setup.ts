"use server";

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { count, eq } from "drizzle-orm";
import { ADMIN_ROLE } from "@/config/platform";
import { account, user, workspaces } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { getWorkspaceBySlug } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Create the very first Orbit Admin from the `/setup` first-run wizard.
 * Unauthenticated by necessity, so it's strictly gated: it ONLY succeeds when
 * the `user` table is empty, re-checked inside a transaction so a double
 * submit or race can never create a second admin.
 *
 * Inserts the user + credential account directly rather than calling
 * `auth.api.signUpEmail` — that endpoint is deliberately blocked server-side
 * unless an Orbit Admin has enabled the `password_auth` feature flag (see
 * lib/auth.ts), which is off by default and would block this exact
 * closed-instance bootstrap case. The client signs in with
 * `authClient.signIn.email` right after this succeeds (sign-IN always works,
 * regardless of that flag).
 */
export async function createFirstAdminAction(input: {
  email: string;
  name: string;
  password: string;
}): Promise<ActionResult<{ email: string }>> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const { password } = input;

  if (!name) {
    return { success: false, error: "Name is required.", field: "name" };
  }
  if (!EMAIL_RE.test(email)) {
    return {
      success: false,
      error: "Enter a valid email address.",
      field: "email",
    };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      field: "password",
    };
  }

  const hashed = await hashPassword(password);

  try {
    const result = await db.transaction(async (tx) => {
      const [row] = await tx.select({ c: count() }).from(user).limit(1);
      if ((row?.c ?? 0) > 0) {
        return {
          error: "This instance is already set up.",
          ok: false as const,
        };
      }

      const now = new Date();
      const userId = randomUUID();

      await tx.insert(user).values({
        id: userId,
        email,
        // Verified so this account can sign in even when requireEmailVerification
        // is active (SMTP configured) — there's no one else to verify it against.
        emailVerified: true,
        name,
        role: ADMIN_ROLE,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(account).values({
        id: randomUUID(),
        accountId: email,
        createdAt: now,
        password: hashed,
        providerId: "credential",
        updatedAt: now,
        userId,
      });

      return { ok: true as const, userId };
    });

    if (!result.ok) {
      return { success: false, error: result.error };
    }

    await audit({
      action: "setup.first_admin_created",
      actorEmail: email,
      actorId: result.userId,
      description: "First administrator created via first-run setup",
      entityId: result.userId,
      entityType: "user",
    });

    return { success: true, data: { email } };
  } catch (error) {
    console.error("[setup] failed to create first admin", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

/**
 * Clears `requiresIntegrationSetup` on the workspace created by the
 * first-run wizard, letting its owner into the Dashboard. SMTP is no longer
 * a hard gate here — an unreachable admin shouldn't be locked out of their
 * own instance over it. Instead, the Dashboard nudges an unconfigured Orbit
 * Admin to fix it, and email-dependent actions (invites) disable themselves
 * with an explanation until it's set. A no-op (still success) if the
 * workspace never required this, so calling it twice is harmless.
 */
export async function completeFirstRunSetupAction(
  workspaceSlug: string
): Promise<ActionResult> {
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace || workspace.ownerId !== session.user.id) {
    return { success: false, error: "Workspace not found." };
  }

  if (!workspace.requiresIntegrationSetup) {
    return { success: true, data: undefined };
  }

  await db
    .update(workspaces)
    .set({ requiresIntegrationSetup: false })
    .where(eq(workspaces.id, workspace.id));

  return { success: true, data: undefined };
}
