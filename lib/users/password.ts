import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/config/platform";
import { account } from "@/db/schema";
import { db } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/orbit/feature-flags";

// Password management for accounts that were created WITHOUT one — the normal
// case on this instance, since magic-link and Google are the primary sign-in
// methods and neither sets a password. Better Auth exposes no endpoint for
// "add a first password to an existing user" (its changePassword requires a
// current password, and password reset requires a credential account that does
// not exist yet), so this writes the credential row directly — the same
// approach app/actions/setup.ts already uses to bootstrap the first admin.

export const CREDENTIAL_PROVIDER = "credential";

/** Whether this user can sign in with email + password today. */
export async function hasPassword(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, CREDENTIAL_PROVIDER),
        isNotNull(account.password)
      )
    )
    .limit(1);

  return !!row;
}

/**
 * Whether this user has a social (OAuth) sign-in linked — Google today.
 *
 * Such a user already has a working, self-service way back into their account,
 * so they are never *forced* to choose a password: that would be friction for
 * something they did not ask for. They can still set one from account settings
 * if they want email + password as a second option.
 */
export async function hasSocialAccount(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        ne(account.providerId, CREDENTIAL_PROVIDER)
      )
    )
    .limit(1);

  return !!row;
}

/**
 * Set (or replace) this user's password. Safe to call whether or not a
 * credential row already exists: an existing one is updated in place so a user
 * never ends up with two.
 *
 * Callers are responsible for authenticating the request — this performs no
 * permission check of its own.
 */
export async function setUserPassword(
  userId: string,
  password: string
): Promise<void> {
  const hashed = await hashPassword(password);
  const now = new Date();

  const [existing] = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, CREDENTIAL_PROVIDER)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(account)
      .set({ password: hashed, updatedAt: now })
      .where(eq(account.id, existing.id));
    return;
  }

  await db.insert(account).values({
    id: randomUUID(),
    // Better Auth's own signUp.email stores the USER ID here for credential
    // accounts, so match it. Sign-in itself only matches on providerId (see
    // node_modules/better-auth/dist/api/routes/sign-in.mjs), but account
    // linking/unlinking and the data export do read accountId — following the
    // library's convention keeps those consistent.
    accountId: userId,
    createdAt: now,
    password: hashed,
    providerId: CREDENTIAL_PROVIDER,
    updatedAt: now,
    userId,
  });
}

/**
 * Check a plaintext password against the user's stored credential.
 * Returns false when they have no password at all, so callers never treat
 * "nothing to compare against" as a match.
 */
export async function verifyUserPassword(
  userId: string,
  password: string
): Promise<boolean> {
  const [row] = await db
    .select({ password: account.password })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, CREDENTIAL_PROVIDER),
        isNotNull(account.password)
      )
    )
    .limit(1);

  if (!row?.password) {
    return false;
  }

  return verifyPassword({ hash: row.password, password });
}

/**
 * Should this user be asked to choose a password before continuing?
 *
 * True only when all three hold:
 *   - the instance actually offers email + password sign-in (`password_auth`),
 *   - they have no password yet, and
 *   - they have no social login either, so a password is their ONLY route back.
 *
 * That last condition is what keeps Google users out of the prompt. The check
 * lives here, in one place, because three separate callers depend on it
 * agreeing exactly — the invite accept, the join-link accept, and the
 * finish-setup page itself, which would otherwise render an empty form or
 * bounce someone straight back out.
 */
export async function needsPasswordSetup(userId: string): Promise<boolean> {
  // Flag first: it is cached in-process for 60s, so the common "feature is
  // off" case costs nothing. This runs on every admin page load (the
  // workspace layout enforces the step), hence the single combined query
  // below rather than calling hasPassword and hasSocialAccount separately.
  if (!(await isFeatureEnabled("password_auth"))) {
    return false;
  }

  const linked = await db
    .select({ password: account.password, providerId: account.providerId })
    .from(account)
    .where(eq(account.userId, userId));

  const alreadyHasPassword = linked.some(
    (a) => a.providerId === CREDENTIAL_PROVIDER && a.password !== null
  );
  const hasSocial = linked.some((a) => a.providerId !== CREDENTIAL_PROVIDER);

  return !(alreadyHasPassword || hasSocial);
}

/** Shared validation so every entry point rejects the same inputs. */
export function validatePassword(
  password: string,
  confirm: string
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }
  if (password !== confirm) {
    return "Passwords do not match.";
  }
  return null;
}
