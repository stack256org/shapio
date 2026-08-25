# Feature 01 — Authentication

## Overview

**There is no self-serve registration.** An account exists for exactly two reasons: the first-run `/setup` wizard created the first Orbit Admin, or a Brand Admin invited the person. Anyone else who tries to sign in — by magic link, Google, or one-time code — is told *"No account found for that email. Accounts on this instance are created by invitation."* and no account is created.

This is enforced at the auth layer (`lib/users/registration.ts`), not merely by hiding a form: the `/sign-up/email` endpoint refuses outright, the email-based endpoints refuse an unknown address *before* sending anything, and a final check on user creation catches Google, whose email is only known at callback time. Without it, anyone reaching `/signin` could type any address, click the emailed link, and land in onboarding as the Brand Admin of a workspace they created themselves.

**How an invited person gets their account:** a live invitation whitelists that email address. Their first magic-link sign-in is allowed to create the account, and accepting the invite consumes the invitation.

People sign in with a **Magic Link**, with **Google**, or — once they have set one — with **email + password**. An Orbit Admin can hide the password field per-instance from **Platform → Feature Flags** (`password_auth`); that flag now controls only the sign-IN field, since registration is gone entirely.

The **same sign-in serves all four product roles**: a Platform Admin, a Brand Admin, a Team Member, and a User all sign in through the same screen. Where they land afterwards depends on what their account already has, not on a different login. (For the role model, see [../PLATFORM.md](../PLATFORM.md).)

Anyone can browse a brand's public boards, roadmap, and changelog without an account.

**On the Public Portal, participation needs a verified email — not an account.** A visitor who submits feedback, votes, or comments is asked for their email address, sent a 6-digit code, and is on their way as soon as they enter it. No password, no signup form, and no user account is created; the verified address is remembered in their browser for 30 days. This is what makes a shared portal link usable by customers who will never sign up for anything.

**The portal's Sign In button verifies an email — it does not open the app's login screen.** Clicking it opens the same one-time-code prompt the mid-page actions use, so a customer identifies themselves without leaving the board. Accounts on this instance are invitation-only, so sending a customer to `/signin` would land them on a screen they have nothing to sign in with. Workspace members who do have an account reach `/signin` from a secondary link at the bottom of that prompt.

Two things still require a real account: **following the roadmap** (it delivers ongoing email, tied to notification preferences a guest cannot hold) and everything on the **admin side** — dashboards, moderation, settings. A signed-in account always takes precedence over guest verification.

An Orbit Admin can turn accountless participation off instance-wide with the `guest_voting` feature flag (**Platform → Feature Flags**, on by default). With it off, the portal reverts to requiring sign-in for all three actions, and the header's Sign In button goes back to linking straight to `/signin`.

### What accountless participation costs

Votes are de-duplicated by verified email, so one address is one vote — but someone with several working mailboxes can cast several votes. Verification raises the effort; it does not make ballot-stuffing impossible. This is inherent to letting people participate without accounts. Brands that need stronger vote integrity should turn the flag off.

Guests are also, deliberately, more limited than account holders: their comments are **final** (no edit or delete — workspace members can still moderate them), they cannot react to comments, and they get no profile page. They do receive email when their feedback gets a comment or changes status.

---

## Sign-in Methods

All three methods sign an **existing or invited** person in. None of them will register a stranger.

| Method | What the person does |
|---|---|
| **Magic Link** | Enters their email and receives a one-time sign-in link. Unknown addresses are refused before any email is sent, so nobody gets a link that could only fail. |
| **Google** | Clicks "Continue with Google" and approves on Google's screen. If the resulting email has neither an account nor an invitation, sign-in is refused and no account is created. |
| **Email + Password** | Available once the person has a password. Invited members choose one during setup (see below); anyone can set or change one from account settings. The field is hidden when `password_auth` is off. |

The "Continue with Google" option appears only when Google sign-in is configured and enabled.

Product facts:

- No sign-up page exists. `/signup` redirects to `/signin`, and the endpoint behind it is refused server-side.
- An invited person's first magic-link sign-in creates their account — that is the only path that brings a new account into existence after `/setup`.
- Magic-link and Google sign-in still work normally for everyone who already has an account.
- Forgot-password / reset-password only helps someone who already has a password, since the reset needs an existing credential. Invited members therefore set their password during setup rather than relying on reset.

### Setting a password

Magic link and Google create an account with **no password**, and password reset cannot help — it needs a credential record that does not exist yet. So:

- An invited member is asked to choose a password on the finish-setup screen, right after accepting the invitation and alongside their display name. This is required (enforced in the workspace layout, not just the redirect), so they cannot end up locked out of a sign-in method the instance advertises.
- People who signed in with **Google are exempt** — they already have a working way in. They can still set a password from account settings if they want one.
- Everyone can set or change a password under **Account Settings → Password**. Changing an existing one requires the current password; setting a first one does not, because there is nothing to challenge.

---

## Pages

IdeaRoads exposes clean, predictable URLs for the sign-in experience:

| Page | Purpose |
|---|---|
| `/signin` | Sign in (Magic Link + Google), plus password sign-in when `password_auth` is enabled |
| `/signup` | Always redirects to `/signin` — there is no self-serve registration. Kept so old links and bookmarks don't 404 |
| `/forgot-password` | Request a password-reset email — only reachable when `password_auth` is enabled and SMTP is configured |
| `/reset-password` | Set a new password from the emailed reset link |
| `/setup` | First-run wizard on a brand-new instance (empty `user` table): creates the first Orbit Admin and the first workspace. Redirects to `/signin` once the instance has any user. |
| `/post-auth` | Routes a freshly signed-in person to the right destination |
| `/invite/[token]` | Accept an invitation to join a workspace |

---

## Post Sign-in Routing

After a person signs in, IdeaRoads sends them to the right place automatically:

- **No workspace yet** → onboarding, where they create their first workspace and become its Brand Admin.
- **Already a member of one or more workspaces** → their workspace dashboard.
- **Arrived via an invite link** → the invitation is accepted, then they land on the workspace dashboard.

This routing is the same regardless of how the person signed in.

---

## Sign Out

A signed-in person can sign out at any time from the account menu. Signing out ends their session and returns them to the sign-in screen.

---

## Profile & Account

Any signed-in person can manage their own account:

- **Edit profile** — update their display name and avatar.
- **Delete account** — permanently remove their account. Deletion is irreversible and requires explicit confirmation. After deletion, their feedback is anonymised and their vote counts are preserved, so the brand's data stays intact while the person's identity is erased.

---

## Flows

### Sign in with Magic Link (new person)

```
1. Visit /signin
2. Enter email → request the magic link
3. See a "Check your email" confirmation
4. Open the email and click the one-time link
5. Signed in (account created automatically)
6. Routed via /post-auth → no workspace → onboarding
```

### Sign in with Magic Link (returning person)

```
1–5. Same as above
6.  Routed via /post-auth → existing workspace → workspace dashboard
```

### Sign in with Google

```
1. Visit /signin
2. Choose "Continue with Google"
3. Approve on Google's consent screen
4. Signed in (account created or linked automatically)
5. Routed via /post-auth (same rules as Magic Link)
```

### Accept an invitation

```
1. Open an invite link (/invite/[token])
2. Sign in if not already signed in (Magic Link or Google)
3. The invitation is accepted
4. Land on the workspace dashboard as a Team Member
```

### Sign out

```
1. Open the account menu
2. Choose "Sign out"
3. Session ends → returned to /signin
```

---

## Acceptance Criteria

- A person **who already has an account, or a live invitation,** can sign in with a Magic Link or with Google.
- A person with neither is refused on every method, with a message telling them accounts are created by invitation — and **no account row is created**.
- The refusal happens before any email is sent, so nobody receives a magic link or code that could only fail.
- `/signup` always redirects to `/signin`, and `/sign-up/email` is refused server-side.
- Email + password sign-in appears only when an Orbit Admin has enabled the `password_auth` feature flag; that flag no longer has anything to do with registration.
- An invited member must set a password before entering the workspace (unless they signed in with Google); anyone can set or change one from account settings.
- A brand-new instance with no users is routed to `/setup` instead of `/signin`; completing it creates the first Orbit Admin and first workspace, and `/setup` becomes unreachable (redirects to `/signin`) afterwards.
- The same sign-in serves all four roles (Orbit Admin, Brand Admin, Team Member, User).
- After signing in, a person with no workspace reaches onboarding.
- After signing in, a person with one or more workspaces reaches their workspace dashboard.
- A person arriving through an invite link has the invitation accepted and then reaches the workspace dashboard.
- A signed-in person can sign out and is returned to the sign-in screen.
- A signed-in person can edit their display name and avatar.
- A signed-in person can permanently delete their account after explicit confirmation; their feedback is anonymised and vote counts are preserved.
- An expired or already-used Magic Link cannot sign anyone in; the person is told the link is no longer valid.
- The "Continue with Google" option only appears when Google sign-in is enabled.

---

> **Implementation reference.** API endpoints, the sign-in service layer, rate limiting, session handling, and engineering notes live in [../implementation/features/01-authentication.md](../implementation/features/01-authentication.md). The sign-in library and environment configuration are documented in [../implementation/TECH-STACK.md](../implementation/TECH-STACK.md).
