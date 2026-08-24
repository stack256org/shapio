import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { user, workspaceInvites } from "@/db/schema";
import { db } from "@/lib/db";
import { hasLiveInviteLink } from "@/lib/workspaces/invite-links";

// This instance does not offer self-serve registration. Accounts come from
// exactly three places:
//
//   1. The first-run `/setup` wizard, which creates the first Orbit Admin by
//      inserting rows directly (app/actions/setup.ts) and therefore never
//      passes through Better Auth or the checks here.
//   2. A personal invitation sent by a Brand Admin to a specific address
//      (workspace_invites — see hasPendingInvite).
//   3. A shareable invite link (workspace_invite_links), which is not
//      addressed to anyone in particular — see extractInviteLinkToken.
//
// Everything else — magic link, Google, email OTP, the old /sign-up/email
// endpoint — can still SIGN IN an existing account, but must not bring a new
// one into existence. Without this, anyone who reached /signin could type any
// address, click the emailed link, and land in onboarding as the Brand Admin
// of a workspace they created themselves.
//
// Public Portal visitors do not need accounts at all: they participate by
// verifying an email (lib/portal/guest-identity.ts), which creates no user.

export const NO_SELF_SIGNUP_MESSAGE =
  "No account found for that email. Accounts on this instance are created by invitation — ask an admin to invite you.";

/** Does an account already exist for this address? Then it's a sign-in. */
export async function userExistsByEmail(email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(sql`lower(${user.email})`, email.trim().toLowerCase()))
    .limit(1);

  return !!row;
}

/**
 * Is there a live invitation for this address — pending, not revoked, not yet
 * expired? Mirrors checkDuplicateInvite's conditions, but across every
 * workspace rather than one.
 */
export async function hasPendingInvite(email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: workspaceInvites.id })
    .from(workspaceInvites)
    .where(
      and(
        eq(sql`lower(${workspaceInvites.email})`, email.trim().toLowerCase()),
        isNull(workspaceInvites.acceptedAt),
        isNull(workspaceInvites.revokedAt),
        gt(workspaceInvites.expiresAt, new Date())
      )
    )
    .limit(1);

  return !!row;
}

const INVITE_LINK_PATH_PATTERN = /\/invite\/link\/([^/?#]+)/;

/**
 * A shareable invite link (see app/invite/link/[linkToken]) is not addressed
 * to any particular email — that's the whole point of it being shareable —
 * so it can't be found by hasPendingInvite. Instead, the sign-in flow carries
 * it through as the `callbackURL`/`next` the person was on their way to
 * (e.g. "/invite/link/&lt;token&gt;") when they were bounced to /signin. Pull the
 * token back out of that path so its own liveness (active, unexpired, under
 * its use cap) can stand in for "this address was invited".
 */
export function extractInviteLinkToken(
  callbackURL?: string | null
): string | null {
  if (!callbackURL) {
    return null;
  }
  let decoded = callbackURL;
  try {
    decoded = decodeURIComponent(callbackURL);
  } catch {
    // Already decoded (or not validly encoded) — fall through and match as-is.
  }
  return (
    INVITE_LINK_PATH_PATTERN.exec(decoded)?.[1] ??
    INVITE_LINK_PATH_PATTERN.exec(callbackURL)?.[1] ??
    null
  );
}

/**
 * May a brand-new account be created for this address?
 *
 * Only when an admin has already invited it by email, or the person arrived
 * via a live shareable invite link. Callers that run BEFORE we know whether
 * the account exists (the sign-in endpoints) should also accept an existing
 * user — see mayAuthenticate.
 */
export async function mayCreateAccount(
  email: string,
  callbackURL?: string | null
): Promise<boolean> {
  if (await hasPendingInvite(email)) {
    return true;
  }
  const linkToken = extractInviteLinkToken(callbackURL);
  return linkToken ? hasLiveInviteLink(linkToken) : false;
}

/**
 * May this address proceed through a sign-in endpoint at all?
 *
 * True when the account already exists (an ordinary sign-in) or an invitation
 * is waiting (a first sign-in that is allowed to create the account). Used to
 * refuse early — before a magic link or one-time code is emailed — so nobody
 * receives a link that would fail at the end.
 */
export async function mayAuthenticate(
  email: string,
  callbackURL?: string | null
): Promise<boolean> {
  if (await userExistsByEmail(email)) {
    return true;
  }
  return mayCreateAccount(email, callbackURL);
}
