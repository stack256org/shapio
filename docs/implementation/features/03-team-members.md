> Implementation reference for Feature 03 — Team Members. Product behaviour: [../../features/03-team-members.md](../../features/03-team-members.md)

# Feature 03 — Team Members (Implementation Reference)

This document captures the technical implementation detail for the Team Members feature: schema, role mapping, service layer, routes, file layout, background jobs, and engineering notes. For **what the feature does** (product behaviour, flows, acceptance criteria), see the product spec linked above.

> **Implemented (Phase 6 — URL alignment).** The shareable-link acceptance route was moved from `/join/[token]` to **`/invite/link/[linkToken]`** (matching the documented URL), so both invite flows now live under `/invite`: `/invite/[token]` (email invite) and `/invite/link/[linkToken]` (shareable link). The link generator (`create-link-form`) and the middleware matcher were updated accordingly; the link route stays auth-gated by middleware (sign-in first, then accept).

---

## Schema ↔ Product Role Mapping

The `workspace_members.role` column stores the internal values `owner | admin | member`. These are **implementation details only** and never surface in product documentation:

- `owner` → **Brand Admin** (the Brand Admin who owns the workspace)
- `admin` → **Brand Admin**
- `member` → **Team Member**

`owner` is an ownership attribute of a Brand Admin, not a separate product role. Ownership-specific actions (delete workspace, transfer ownership) are gated on the `owner` value.

See [`../DATABASE.md`](../DATABASE.md) for the canonical mapping and full table definitions.

---

## Database Schema

Authoritative definitions live in [`../DATABASE.md`](../DATABASE.md). Summary of the tables this feature uses:

### `workspace_members`

```ts
id            text        PK  (cuid2)
workspace_id  text        NOT NULL  → workspaces.id (CASCADE DELETE)
user_id       text        NOT NULL  → user.id (CASCADE DELETE)
role          text        NOT NULL  -- 'owner' | 'admin' | 'member'
joined_at     timestamp   NOT NULL  DEFAULT now()
```

**Indexes:**
- `UNIQUE` on `(workspace_id, user_id)` — one membership per user per workspace
- Index on `workspace_id`
- Index on `user_id`

### `workspace_invites`

```ts
id              text        PK  (cuid2)
workspace_id    text        NOT NULL  → workspaces.id (CASCADE DELETE)
invited_by      text        NOT NULL  → user.id
email           text                  -- NULL for shareable invite links
role            text        NOT NULL  -- 'admin' | 'member'
token           text        NOT NULL  UNIQUE
is_invite_link  boolean     NOT NULL  DEFAULT false
expires_at      timestamp   NOT NULL
accepted_at     timestamp             -- NULL until accepted
created_at      timestamp   NOT NULL  DEFAULT now()
```

**Indexes:**
- `UNIQUE` on `token`
- Index on `workspace_id`
- Index on `email`

**Rules:**
- Email invites: `email` is set, `is_invite_link = false`, single-use (`accepted_at` set on use)
- Shareable links: `email = NULL`, `is_invite_link = true`, reusable (`accepted_at` not set)

---

## Dependencies

```
@paralleldrive/cuid2    — generate invite tokens
pg-boss                 — job queue for emails + cron cleanup
nodemailer              — deliver invite and removal emails
```

---

## Environment Variables

No new variables beyond Feature 01. Uses:

```env
DATABASE_URL
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / EMAIL_FROM
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
```

---

## File Structure

```
app/
├── invite/
│   ├── [token]/
│   │   └── page.tsx                    Email invite accept page
│   └── link/
│       └── [linkToken]/
│           └── page.tsx                Shareable link accept page
├── (workspace)/
│   └── [ws-slug]/
│       └── settings/
│           └── members/
│               └── page.tsx            Members settings page
└── api/
    └── workspaces/
        └── [slug]/
            ├── members/
            │   ├── route.ts            GET list / POST invite by email
            │   ├── me/
            │   │   └── route.ts        DELETE (leave workspace)
            │   └── [memberId]/
            │       └── route.ts        PATCH (change role) / DELETE (remove)
            └── invites/
                ├── route.ts            GET pending invites / POST create invite link
                └── [inviteId]/
                    └── route.ts        DELETE (revoke invite)

components/
└── members/
    ├── members-table.tsx               Full member list with role, avatar, actions
    ├── invite-by-email-form.tsx        Email + role selector + send button
    ├── invite-link-box.tsx             Copy invite link + revoke button
    ├── change-role-dropdown.tsx        Inline role change select
    ├── remove-member-dialog.tsx        AlertDialog confirm removal
    ├── leave-workspace-dialog.tsx      AlertDialog confirm leave
    └── transfer-ownership-dialog.tsx   Select new owner + confirm

lib/
└── workspaces/
    ├── members.ts                      Member service functions
    └── invites.ts                      Invite service functions

lib/worker/handlers/
├── send-workspace-invite-email.ts
├── send-member-removed-email.ts
└── cleanup-expired-invites.ts

lib/email/templates/
├── workspace-invite.ts                 Email HTML template
└── member-removed.ts                   Email HTML template
```

---

## Service Layer

### `lib/workspaces/members.ts`

```ts
getMembers(workspaceId)
  → returns workspace_members joined with user (id, name, email, avatar, role, joined_at)
  → sorted by: owner first, then admin, then member, then by joined_at asc

getMember(workspaceId, userId)
  → returns single member record or null

addMember(workspaceId, userId, role)
  → checks user not already a member
  → inserts workspace_members row
  → returns new member

changeRole(workspaceId, memberId, newRole, requesterId)
  → uses pg_advisory_xact_lock(hashtext(workspaceId)::bigint) inside db.transaction()
  → verifies requester is owner or admin
  → verifies target is not the owner (owner role cannot be reassigned this way)
  → verifies requester is not demoting themselves if they are the only admin
  → updates role
  → returns updated member

removeMember(workspaceId, memberId, requesterId)
  → uses pg_advisory_xact_lock inside db.transaction()
  → verifies requester is owner or admin
  → verifies target is not the owner
  → fetches target user info (name, email) before deletion (needed for email)
  → deletes workspace_members row
  → enqueues SEND_MEMBER_REMOVED_EMAIL job
  → returns void

leaveWorkspace(workspaceId, userId)
  → verifies user is a member
  → verifies user is NOT the owner (owners cannot leave)
  → deletes workspace_members row
  → returns void

transferOwnership(workspaceId, currentOwnerId, newOwnerId)
  → uses pg_advisory_xact_lock inside db.transaction()
  → verifies currentOwnerId is the owner
  → verifies newOwnerId is a member of the workspace
  → sets newOwnerId role to 'owner'
  → sets currentOwnerId role to 'admin'
  → updates workspaces.owner_id to newOwnerId
  → returns void
```

### `lib/workspaces/invites.ts`

```ts
createEmailInvite(workspaceId, invitedBy, email, role)
  → checks no active pending invite exists for this email in this workspace
  → generates cuid2 token
  → sets expires_at = now() + 7 days
  → inserts workspace_invites row
  → enqueues SEND_WORKSPACE_INVITE_EMAIL job
  → returns invite

createInviteLink(workspaceId, invitedBy, role)
  → generates cuid2 token
  → sets is_invite_link = true, email = null
  → sets expires_at = now() + 30 days (longer TTL for shareable links)
  → upserts (revoke old link for same workspace + role, create new one)
  → returns invite with token

getInviteByToken(token)
  → returns invite joined with workspace (name, slug) or null

getPendingInvites(workspaceId)
  → returns all invites where accepted_at IS NULL and expires_at > now()

revokeInvite(inviteId, requesterId, workspaceId)
  → verifies requester is admin or owner of the workspace
  → deletes invite row

acceptEmailInvite(token, userId)
  → fetches invite by token
  → verifies invite is not expired (expires_at > now())
  → verifies invite is not already accepted (accepted_at IS NULL)
  → verifies user email matches invite email
  → checks user not already a member
  → in db.transaction():
      → inserts workspace_members row (role from invite)
      → sets invite.accepted_at = now()
  → returns workspace

acceptInviteLink(token, userId)
  → fetches invite by token (is_invite_link = true)
  → verifies invite is not expired
  → checks user not already a member
  → inserts workspace_members row (role from invite)
  → returns workspace
  (does NOT set accepted_at — invite link is reusable)
```

---

## API Routes

### `app/api/workspaces/[slug]/members/route.ts`

**GET** — List members
```
Auth: requireWorkspaceMember
Returns: member[] (id, userId, name, email, avatar, role, joinedAt)
```

**POST** — Invite member by email
```
Auth: requireRole(['owner', 'admin'])
Body: { email: string, role: 'admin' | 'member' }
Validates:
  - Valid email format
  - Role must be 'admin' or 'member' (cannot invite as 'owner')
  - No existing active invite for this email in this workspace
  - User not already a member
Calls: createEmailInvite(...)
Returns: 201 + invite (without token — token is only in the email)
```

### `app/api/workspaces/[slug]/members/[memberId]/route.ts`

**PATCH** — Change member role
```
Auth: requireRole(['owner', 'admin'])
Body: { role: 'admin' | 'member' }
Validates: cannot change owner's role via this endpoint
Calls: changeRole(...)
Returns: updated member
```

**DELETE** — Remove member
```
Auth: requireRole(['owner', 'admin'])
Validates: cannot remove workspace owner
Calls: removeMember(...)
Returns: 204
```

### `app/api/workspaces/[slug]/members/me/route.ts`

**DELETE** — Leave workspace
```
Auth: requireSession + requireWorkspaceMember
Validates: user is not the owner
Calls: leaveWorkspace(...)
Returns: 204
```

### `app/api/workspaces/[slug]/invites/route.ts`

**GET** — List pending invites
```
Auth: requireRole(['owner', 'admin'])
Returns: pending invite[] (id, email, role, createdAt, expiresAt, isInviteLink)
Note: token is never returned in API responses
```

**POST** — Create shareable invite link
```
Auth: requireRole(['owner', 'admin'])
Body: { role: 'admin' | 'member' }
Calls: createInviteLink(...)
Returns: 201 + { inviteUrl: string }
```

### `app/api/workspaces/[slug]/invites/[inviteId]/route.ts`

**DELETE** — Revoke invite
```
Auth: requireRole(['owner', 'admin'])
Calls: revokeInvite(...)
Returns: 204
```

### `app/api/workspaces/[slug]/members/transfer-ownership/route.ts`

**POST** — Transfer ownership
```
Auth: requireRole(['owner'])
Body: { newOwnerId: string }
Calls: transferOwnership(...)
Uses POST (not PATCH) because it is a named action, not a partial update.
```

### API Reference (internal auth values)

| Method | Route | Internal auth | Description |
|---|---|---|---|
| GET | `/api/workspaces/[slug]/members` | member | List all members |
| POST | `/api/workspaces/[slug]/members` | owner/admin | Invite by email |
| PATCH | `/api/workspaces/[slug]/members/[memberId]` | owner/admin | Change role |
| DELETE | `/api/workspaces/[slug]/members/[memberId]` | owner/admin | Remove member |
| DELETE | `/api/workspaces/[slug]/members/me` | any member | Leave workspace |
| GET | `/api/workspaces/[slug]/invites` | owner/admin | List pending invites |
| POST | `/api/workspaces/[slug]/invites` | owner/admin | Create shareable invite link |
| DELETE | `/api/workspaces/[slug]/invites/[inviteId]` | owner/admin | Revoke invite |
| POST | `/api/workspaces/[slug]/members/transfer-ownership` | owner | Transfer ownership |

---

## Page & Component Implementation

### `app/invite/[token]/page.tsx` — Email Invite Accept

Server component flow:
```
1. Fetch invite by token (getInviteByToken)
2. If not found → show "Invalid invite link" error page
3. If expired → show "This invite has expired" error page
4. If already accepted → show "Already accepted" with link to workspace
5. Get current session
   → If not signed in: store token in cookie, redirect /signin?redirect=/invite/[token]
   → If signed in: proceed to accept
6. Verify user email matches invite email
   → If mismatch: show "This invite was sent to a different email address"
7. Call acceptEmailInvite(token, session.user.id)
8. Redirect to /{ws-slug}?welcome=1
```

### `app/invite/link/[linkToken]/page.tsx` — Shareable Link Accept

Server component flow:
```
1. Fetch invite by token (is_invite_link = true)
2. If not found or expired → show error
3. Get current session
   → If not signed in: store token in cookie, redirect /signin?redirect=/invite/link/[token]
4. Check user not already a member
   → If already member: redirect to /{ws-slug} (silent, no error)
5. Call acceptInviteLink(token, session.user.id)
6. Redirect to /{ws-slug}?welcome=1
```

### `app/(workspace)/[ws-slug]/settings/members/page.tsx`

- Server component
- Fetches members list + pending invites in parallel
- Renders `<MembersTable />` + `<InviteByEmailForm />` + `<InviteLinkBox />`
- Only visible to owner and admin (layout guards + API guards)

### `components/members/members-table.tsx`

- Columns: Avatar + Name, Email, Role, Joined Date, Actions
- Search input (client-side filter by name/email)
- Role filter dropdown (All / Owner / Admin / Member)
- Per-row actions:
  - `<ChangeRoleDropdown />` — owner can change any role; admin can change member roles only
  - Remove button → opens `<RemoveMemberDialog />`
- Owner row: no remove button, no role change dropdown (role is locked)
- Current user row: shows "Leave" instead of "Remove" → opens `<LeaveWorkspaceDialog />`
- Transfer Ownership button: shown only to owner, opens `<TransferOwnershipDialog />`

### `components/members/invite-by-email-form.tsx`

- Fields: email input + role select (Admin / Member, default: Member)
- Submit → POST `/api/workspaces/[slug]/members`
- On success: toast "Invite sent to {email}", clear form, refresh pending invites list
- On duplicate error (already invited): toast "This email already has a pending invite"
- On already member error: toast "This user is already a member"

### `components/members/invite-link-box.tsx`

- Shows the shareable invite URL in a read-only input
- "Copy link" button (copies to clipboard, shows "Copied!" feedback)
- Role selector: choose what role link-joiners get (Admin / Member)
- Changing role creates a new link (old one is revoked)
- "Revoke link" button → DELETE invite → link disappears, "Generate new link" button appears
- If no link exists: shows "Generate invite link" button

---

## Background Jobs

See [`../JOBS.md`](../JOBS.md) for the queue overview.

### `SEND_WORKSPACE_INVITE_EMAIL`

**Trigger:** `createEmailInvite()` — after invite row is inserted

**Payload:**
```ts
{
  inviteId: string
  email: string
  workspaceName: string
  inviterName: string
  role: string
  inviteUrl: string       // NEXT_PUBLIC_APP_URL + /invite/ + token
  expiresAt: string       // ISO date string
}
```

**Handler:** `lib/worker/handlers/send-workspace-invite-email.ts`
- Sends email via Nodemailer
- Subject: `"{inviterName} invited you to {workspaceName} on IdeaRoads"`
- Body: workspace name, role, invite button/link, expiry date

### `SEND_MEMBER_REMOVED_EMAIL`

**Trigger:** `removeMember()` — after member row is deleted

**Payload:**
```ts
{
  removedUserEmail: string
  removedUserName: string
  workspaceName: string
  removedByName: string
}
```

**Handler:** `lib/worker/handlers/send-member-removed-email.ts`
- Sends email via Nodemailer
- Subject: `"You've been removed from {workspaceName}"`
- Body: workspace name, removed-by name, note that they can contact the workspace owner

### `CLEANUP_EXPIRED_INVITES`

**Schedule:** Nightly cron at 2:00 AM (registered via pg-boss)

**Logic:**
```ts
DELETE FROM workspace_invites
WHERE expires_at < now()
AND accepted_at IS NULL
```

**Handler:** `lib/worker/handlers/cleanup-expired-invites.ts`

**Registration** in `lib/worker/scheduler.ts`:
```ts
await boss.schedule("CLEANUP_EXPIRED_INVITES", "0 2 * * *")
```

---

## Validation Rules

| Field | Rules |
|---|---|
| `email` (invite) | Valid email format, not already a member, no active pending invite |
| `role` (invite) | Must be `'admin'` or `'member'` — cannot invite as `'owner'` |
| `role` (change) | Must be `'admin'` or `'member'` — cannot set via this endpoint to `'owner'` |
| Transfer target | Must be an existing member of the workspace |

---

## Edge Cases (implementation handling)

| Case | Handling |
|---|---|
| Invitee is already a member | API returns 409 — "This user is already a member" |
| Duplicate email invite (active one exists) | API returns 409 — "An invite is already pending for this email" |
| User clicks invite link after already joining | Accept page detects existing membership → silent redirect to workspace |
| Invite token is expired | Accept page shows "This invite has expired. Ask the workspace admin to send a new one." |
| User clicks invite link while signed in as different email | Shows "This invite was sent to {email}. Please sign in with that account." |
| Admin tries to remove another admin | API returns 403 — only the owning Brand Admin can remove other Brand Admins |
| Last admin tries to change own role to member | API blocks — workspace must always have at least one admin/owner |
| Owner tries to leave | API returns 400 — "Workspace owner cannot leave. Transfer ownership first." |
| Invite link used after being revoked | token not found in DB → accept page shows "Invalid invite link" |
| Race condition: two users accept invite link simultaneously | `UNIQUE (workspace_id, user_id)` constraint handles it — second insert fails gracefully |

---

## Engineering Notes

- `pg_advisory_xact_lock(hashtext(workspaceId)::bigint)` is used inside `db.transaction()` for all member mutations — prevents race conditions on concurrent role changes or simultaneous removals.
- Invite tokens are **never returned in API responses** — they exist only in the database and in the email link. The GET `/api/workspaces/[slug]/invites` endpoint returns invite metadata but not the token field.
- Shareable invite link URL format: `{NEXT_PUBLIC_APP_URL}/invite/link/{linkToken}`.
- Email invite URL format: `{NEXT_PUBLIC_APP_URL}/invite/{token}`.
- After sign-in redirect: token stored in a short-lived cookie (`invite_token`, httpOnly, 10 min TTL) so the invite flow survives the OAuth/magic-link redirect.
- `workspace_invites.accepted_at` is only set for email invites, not shareable links — this distinction is used by the cleanup job.
- The `transfer-ownership` endpoint uses `POST` not `PATCH` because it is a named action, not a partial update.
