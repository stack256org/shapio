# Feature 13 — Platform Admin (Implementation Reference)

> Implementation reference for Feature 13 — Platform Admin. Product behaviour: ../../features/13-orbit-admin.md

This file captures the technical detail removed from the product spec: access control, seeding, impersonation, plan enforcement, feature flags, API endpoints, components, and engineering notes. For the full database schema see [../DATABASE.md](../DATABASE.md).

> **Implemented (Phase 6 — access hardening).**
> - **Orbit is now invisible (M1):** `requireAdmin()` (`lib/authz.ts`) returns `notFound()` for a signed-in user who is not a platform admin, instead of redirecting to `/post-auth` — the area's existence is never revealed. Signed-out users are still sent to `/signin` (by `requireSession` and the middleware), with `?next=/orbit` so they return after authenticating.
> - **Suspension applies to everyone (L1):** the platform-admin bypass was removed from the workspace and public `[slug]` layouts. A suspended workspace shows the unavailable notice to all visitors, including platform admins — platform admins govern suspended workspaces from `/orbit`, not from the live workspace.

> **Terminology note.** In product prose the internal-staff role is **Platform Admin** (previously "Orbit Admin"). Internally the implementation stores and references this concept as `superadmin` (the `superadmins` table, `requireSuperadmin()`, `grantSuperadmin()`, etc.). The two terms are interchangeable below; `superadmin` is an implementation detail only.

---

## Access Control

### Orbit layout auth check

Orbit reuses the existing `/signin` flow — there is no separate Orbit login page.

Both the page layout and the API helper enforce the same rule, and deliberately return **404 (not 403)** so that Orbit's existence is never revealed to non-superadmins.

`app/(orbit)/layout.tsx` — server component, runs on every `/orbit/*` request:

```ts
async function OrbitLayout({ children }) {
  const session = await getServerSession()
  if (!session) redirect("/signin?next=/orbit")

  const isSuperadmin = await db.query.superadmins.findFirst({
    where: eq(superadmins.userId, session.user.id),
  })
  if (!isSuperadmin) notFound()  // 404, not 403 — don't reveal Orbit exists

  return (
    <div className="orbit-layout">
      <OrbitSidebar currentUser={session.user} />
      <main>{children}</main>
    </div>
  )
}
```

### API auth middleware

All `/api/orbit/*` routes use a shared helper:

```ts
// lib/orbit/auth.ts
export async function requireSuperadmin(request: NextRequest) {
  const session = await getServerSession();
  if (!session) throw new ApiError(401, "Unauthorized");

  const superadmin = await db.query.superadmins.findFirst({
    where: eq(superadmins.userId, session.user.id),
  });
  if (!superadmin) throw new ApiError(404, "Not found"); // same as layout — don't reveal Orbit

  return { session, superadmin };
}
```

---

## Seeding

### First platform admin seed

On first startup with no superadmins in the database, the startup job in `lib/worker/startup.ts` reads `ORBIT_SEED_EMAIL` from env. If set, it upserts a `superadmins` record linked to the user with that email (a pending record that activates once the user signs in for the first time).

```env
ORBIT_SEED_EMAIL=admin@example.com   # First platform admin email (optional)
```

If `ORBIT_SEED_EMAIL` is not set and no superadmins exist, `/orbit` remains inaccessible until a `superadmins` row is manually inserted.

### Seed flow

```
1. Operator sets ORBIT_SEED_EMAIL=admin@example.com in .env
2. App starts → lib/worker/startup.ts runs
3. Checks superadmins table: empty
4. Looks up user by ORBIT_SEED_EMAIL
   → if user exists: INSERT INTO superadmins (user_id) ON CONFLICT DO NOTHING
   → if user does not exist yet: INSERT INTO superadmins (email) — pending record
5. On first sign-in by that email:
   → Better Auth `onSignIn` hook checks superadmins WHERE email = signedInEmail
   → if found: UPDATE superadmins SET user_id = newUserId, email = null
6. Operator signs in as admin@example.com
7. Navigates to /orbit → access granted
```

### Granting / revoking

```ts
grantSuperadmin(userId, grantedBy)
  → INSERT INTO superadmins (userId) ON CONFLICT DO NOTHING
  → createAuditLog

revokeSuperadmin(userId, revokedBy)
  → guard: userId !== revokedBy (cannot self-revoke; API returns 400)
  → DELETE FROM superadmins WHERE user_id = userId
  → createAuditLog
```

---

## Impersonation

Impersonation is **disabled by default** and gated behind `ENABLE_IMPERSONATION`. Lets a superadmin act as any user for support/debugging without their password.

```env
ENABLE_IMPERSONATION=false   # Set to true to allow impersonation (15-min TTL). Default: false (disabled in prod)
```

### Flow

```
1. Superadmin clicks "Impersonate" on /orbit/users/[userId]
2. POST /api/orbit/users/[userId]/impersonate
3. Server:
   a. Verifies caller is superadmin
   b. Creates a special Better Auth session for targetUser
      (or signs in as target user using Better Auth's admin API if available,
       otherwise: creates a temporary impersonation cookie containing
       { superadminId, targetUserId, originalSessionId } signed with BETTER_AUTH_SECRET)
   c. Sets httpOnly cookie: impersonation_session (15 min TTL)
   d. Logs to audit_logs: action='impersonation.started', actor=superadminId, entityId=targetUserId
4. Response: { redirectUrl: '/' }
5. Client: window.location.href = redirectUrl
6. User now browsing as the target user
7. ImpersonateBanner shown at top of every page (reads impersonation_session cookie)
```

### Ending impersonation — `app/api/orbit/end-impersonation/route.ts`

```
POST — no body required
Reads impersonation_session cookie:
  - Clears it
  - If originalSessionId present: re-activates original superadmin session
  - createAuditLog: impersonation.ended
  - Redirects to /orbit
```

### Audit

Two audit entries are always created: `impersonation.started` (begin) and `impersonation.ended` (manual end or cookie expiry). Stored with `entity_type = 'user'`.

### Security notes

- Impersonation cookie is httpOnly (not readable by JS), signed with `BETTER_AUTH_SECRET`.
- TTL: 15 minutes — auto-expires.
- Any write action taken while impersonating records the impersonator ID in `actor_id` in `audit_logs` — not the target user's ID.
- Impersonation is disabled in production unless `ENABLE_IMPERSONATION=true` is set.

---

## Plan Enforcement

Plan limits are enforced server-side in each relevant service function. A shared helper reads the workspace's current plan, falling back to the default plan when no explicit assignment exists.

```ts
// lib/plans/enforce.ts
export async function getWorkspacePlan(workspaceId: string): Promise<Plan> {
  // Joins workspace_plan_assignments → plans, falls back to default plan
}

export async function assertBoardLimit(workspaceId: string): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId)
  if (plan.maxBoards === null) return  // unlimited
  const count = await db.select({ n: count() }).from(boards)
    .where(and(eq(boards.workspaceId, workspaceId), eq(boards.isArchived, false)))
  if (count[0].n >= plan.maxBoards) throw new PlanLimitError("Board limit reached for your plan")
}

export async function assertMemberLimit(workspaceId: string): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId)
  if (plan.maxMembers === null) return
  const count = await db.select({ n: count() }).from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId))
  if (count[0].n >= plan.maxMembers) throw new PlanLimitError("Member limit reached for your plan")
}

export async function assertApiAccess(workspaceId: string): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId)
  if (!plan.allowApiAccess) throw new PlanLimitError("API access is not available on your plan")
}

export async function assertWebhookAccess(workspaceId: string): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId)
  if (!plan.allowWebhooks) throw new PlanLimitError("Webhooks are not available on your plan")
}
```

**Where enforcement is called:**

| Service function | Assertion |
|-----------------|-----------|
| `createBoard()` | `assertBoardLimit(workspaceId)` |
| `inviteMember()` / `acceptInvite()` | `assertMemberLimit(workspaceId)` |
| `createApiKey()` | `assertApiAccess(workspaceId)` |
| `createWebhookEndpoint()` | `assertWebhookAccess(workspaceId)` |

`PlanLimitError` returns HTTP `402 Payment Required` with `{ error: "Plan limit reached", limit: "boards" | "members" | "api_access" | "webhooks" }`. The client shows an upgrade prompt.

### Plan service — `lib/orbit/plans.ts`

```ts
listPlans()
  → SELECT * FROM plans ORDER BY price_usd ASC, created_at ASC

createPlan(data)
  → INSERT INTO plans
  → if data.isDefault: clear previous default first (UPDATE SET is_default=false), then set new
  → createAuditLog: 'plan.created'

updatePlan(id, changes)
  → UPDATE plans WHERE id = id
  → if changes.isDefault: clear previous default within db.transaction()
  → createAuditLog: 'plan.updated'

archivePlan(id)
  → guard: cannot archive the default plan
  → UPDATE plans SET is_archived = true, updated_at = now()
  → createAuditLog: 'plan.archived'

duplicatePlan(id)
  → SELECT original, INSERT copy with name="{original} (Copy)", is_default=false, is_archived=false
  → createAuditLog: 'plan.duplicated'

assignPlanToWorkspace(workspaceId, planId, assignedBy)
  → UPSERT workspace_plan_assignments (workspaceId) DO UPDATE SET plan_id, assigned_by, assigned_at
  → createAuditLog: 'workspace.plan_assigned'

getWorkspacePlan(workspaceId): Plan
  → JOIN workspace_plan_assignments + plans WHERE workspace_id = workspaceId
  → Falls back to the default plan if no explicit assignment exists
```

---

## Feature Flags

Opt-out model: a flag missing from the table defaults to **enabled**.

```ts
// lib/orbit/feature-flags.ts
listFeatureFlags()
  → SELECT * FROM feature_flags ORDER BY key

toggleFlag(key, isEnabled)
  → UPDATE feature_flags SET is_enabled = isEnabled, updated_at = now() WHERE key = key
  → createAuditLog: 'feature_flag.toggled'
  → returns updated flag

isFeatureEnabled(key: string): Promise<boolean>
  → SELECT is_enabled FROM feature_flags WHERE key = key
  → Cache in memory for 60 seconds (module-level Map with TTL)
  → Default: true if flag row does not exist (opt-out model)
```

### Default flags (seeded at startup in `lib/worker/startup.ts`)

```ts
const DEFAULT_FLAGS = [
  { key: "guest_voting", description: "Allow guests to vote with email only", isEnabled: true },
  { key: "magic_link_auth", description: "Magic link sign-in", isEnabled: true },
  { key: "google_auth", description: "Google OAuth sign-in", isEnabled: true },
];

// INSERT INTO feature_flags ON CONFLICT (key) DO NOTHING
```

### Usage

```ts
// Server-side check (in API routes / server components)
import { isFeatureEnabled } from "@/lib/orbit/feature-flags";

const guestVotingEnabled = await isFeatureEnabled("guest_voting");
if (!guestVotingEnabled) {
  // require auth to vote
}
```

---

## Workspace Suspension Enforcement

Suspension columns live on the `workspaces` table — see [../DATABASE.md](../DATABASE.md). When `is_suspended = true`, all public-facing workspace routes return HTTP 503 and members lose dashboard access. Superadmins bypass the check.

### In `(workspace)/[ws-slug]/layout.tsx`

```ts
const workspace = await getWorkspaceBySlug(wsSlug)
if (!workspace) notFound()

// Superadmins can still access suspended workspaces
const isSuperadmin = session ? await checkSuperadmin(session.user.id) : false

if (workspace.isSuspended && !isSuperadmin) {
  // Render suspended page — not a redirect, rendered inline
  return <WorkspaceSuspendedPage />
}
```

`<WorkspaceSuspendedPage />`:

```
This workspace has been suspended.
If you believe this is an error, please contact the platform administrator.
```

- No workspace name shown (avoid confirming the workspace exists).
- HTTP 503 status (set via `generateMetadata` or route handler).
- The same check is applied in `(public)/[ws-slug]/layout.tsx` so public visitors also see the suspended page.

### Workspace service — `lib/orbit/workspaces.ts`

```ts
listOrbitWorkspaces({ page, limit=25, search?, status? })
  → JOIN workspaces + users (owner) + COUNT(boards) + COUNT(posts) + COUNT(workspace_members)
  → ILIKE search on name, slug, owner email
  → filter by is_suspended if status provided
  → returns { workspaces, total, hasMore }

getOrbitWorkspace(workspaceId)
  → full workspace detail with owner, boards, categories, recent 10 posts

suspendWorkspace(workspaceId, suspendedBy: superadminUserId)
  → UPDATE workspaces SET is_suspended=true, suspended_at=now(), suspended_by=suspendedBy
  → createAuditLog (orbit action, workspace scope)

unsuspendWorkspace(workspaceId)
  → UPDATE workspaces SET is_suspended=false, suspended_at=null, suspended_by=null

deleteOrbitWorkspace(workspaceId)
  → db.transaction():
    → DELETE workspaces WHERE id = workspaceId (CASCADE handles children)
    → enqueue SEND_WORKSPACE_DELETED_EMAIL job (from Feature 02)
```

---

## Stats & Jobs Services

### `lib/orbit/stats.ts`

```ts
getPlatformStats()
  → parallel COUNT queries (single Promise.all):
    - total workspaces (non-deleted)
    - suspended workspaces
    - total users
    - total posts (non-deleted)
    - total votes
    - total comments (non-deleted)
    - new workspaces this month
    - new users this month
  → Returns: PlatformStats object
```

### `lib/orbit/jobs.ts`

```ts
getJobQueueStatus()
  → queries pg-boss internal tables:
    - pgboss.job: active jobs grouped by name + state
    - pgboss.job WHERE state = 'failed' AND createdon > NOW() - INTERVAL '24h'
  → Returns: { active: JobStat[], failed: FailedJob[] }
```

pg-boss schema tables used: `pgboss.job` (name, state, createdon, startedon), `pgboss.schedule` (name, cron). Raw SQL only — no pg-boss internal API — to avoid coupling to pg-boss internals.

### `lib/orbit/users.ts`

```ts
listOrbitUsers({ page, limit=25, search?, superadminsOnly? })
  → JOIN users + superadmins (LEFT) + COUNT(workspace_members)
  → ILIKE on name, email
  → returns { users: OrbitUser[], total, hasMore }

getOrbitUser(userId)
  → user detail + accounts (auth methods) + workspace memberships + last 5 posts + last 5 comments
```

---

## API Endpoints

| Method | Route                                  | Description                             |
| ------ | -------------------------------------- | --------------------------------------- |
| GET    | `/api/orbit/stats`                     | Platform summary stats                  |
| GET    | `/api/orbit/workspaces`                | List workspaces (paginated, searchable) |
| GET    | `/api/orbit/workspaces/[id]`           | Workspace detail                        |
| PATCH  | `/api/orbit/workspaces/[id]`           | Suspend workspace                       |
| POST   | `/api/orbit/workspaces/[id]/unsuspend` | Unsuspend workspace                     |
| DELETE | `/api/orbit/workspaces/[id]`           | Delete workspace                        |
| GET    | `/api/orbit/users`                     | List users (paginated, searchable)      |
| GET    | `/api/orbit/users/[id]`                | User detail                             |
| PATCH  | `/api/orbit/users/[id]`                | Grant/revoke superadmin                 |
| POST   | `/api/orbit/users/[id]/impersonate`    | Start impersonation                     |
| POST   | `/api/orbit/end-impersonation`         | End impersonation session               |
| GET    | `/api/orbit/plans`                     | List plans / POST create                |
| GET    | `/api/orbit/plans/[id]`                | Plan detail / PATCH update / DELETE archive |
| GET    | `/api/orbit/feature-flags`             | List feature flags                      |
| PATCH  | `/api/orbit/feature-flags/[key]`       | Toggle feature flag                     |
| GET    | `/api/orbit/audit-log`                 | Platform-level audit log                |
| GET    | `/api/orbit/jobs`                      | Job queue status                        |

All `/api/orbit/*` routes call `requireSuperadmin()` (see [Access Control](#access-control)).

---

## Components

```
app/orbit/                                  Next.js route group (no special framework config)
├── layout.tsx                              Orbit layout — superadmin auth check + sidebar
├── page.tsx                                Dashboard
├── plans/page.tsx                          Plan catalog (create, edit, archive, duplicate)
├── audit-log/page.tsx                      Platform-level audit log
├── workspaces/page.tsx                     Workspace list
├── workspaces/[workspaceId]/page.tsx       Workspace detail
├── users/page.tsx                          User list
├── users/[userId]/page.tsx                 User detail
├── feature-flags/page.tsx                  Feature flags list + toggle
└── jobs/page.tsx                           Job queue status

components/orbit/
├── orbit-sidebar.tsx                       Orbit navigation sidebar (client)
├── orbit-stat-card.tsx                     Summary metric card
├── workspace-table.tsx                     Workspace list table
├── workspace-detail-panel.tsx              Workspace detail + actions
├── user-table.tsx                          User list table
├── user-detail-panel.tsx                   User detail + actions
├── feature-flag-list.tsx                   Feature flag toggles
├── job-queue-table.tsx                     Job queue status table
└── impersonate-banner.tsx                  Banner shown during impersonation (rendered in root app/layout.tsx)

lib/orbit/
├── auth.ts                                 requireSuperadmin() helper (returns 404, not 403)
├── stats.ts                                getPlatformStats()
├── workspaces.ts                           listOrbitWorkspaces(), suspendWorkspace(), deleteOrbitWorkspace()
├── users.ts                                listOrbitUsers(), grantSuperadmin(), revokeSuperadmin()
├── plans.ts                                listPlans(), createPlan(), updatePlan(), archivePlan(), duplicatePlan()
├── feature-flags.ts                        listFeatureFlags(), toggleFlag(), isFeatureEnabled() (60s cached)
└── jobs.ts                                 getJobQueueStatus()
```

The impersonate banner reads the `impersonation_session` cookie and renders fixed at top with a high z-index and amber background, with an "End Impersonation" action posting to `/api/orbit/end-impersonation`.

---

## Orbit Audit Log

Orbit actions are logged in the same `audit_logs` table used by Feature 12, with `workspace_id = null` for platform-level actions:

| Action                            | Entity Type |
| --------------------------------- | ----------- |
| `workspace.suspended`             | `workspace` |
| `workspace.unsuspended`           | `workspace` |
| `workspace.deleted_by_superadmin` | `workspace` |
| `superadmin.granted`              | `user`      |
| `superadmin.revoked`              | `user`      |
| `impersonation.started`           | `user`      |
| `impersonation.ended`             | `user`      |
| `feature_flag.toggled`            | `platform`  |

In MVP these are stored but there is no dedicated Orbit audit-log viewer page; workspace-scoped entries (`workspace_id` set) appear in the workspace's audit log, and platform-level entries are queryable directly from the database. Queries for workspace-scoped logs use `WHERE workspace_id = ?`, which naturally excludes platform-level entries.

---

## Technical Notes

- Orbit is a plain Next.js route group (`app/orbit/`) with its own layout — no special framework or configuration.
- All Orbit pages are server components — no client state except the feature-flag toggles and impersonate button (minimal islands).
- The `isFeatureEnabled()` module-level cache (Map + TTL) means a flag change takes up to 60 seconds to propagate to all server instances in a multi-replica deployment. Acceptable for MVP (flag changes are rare operational actions).
- `workspace_id = null` in `audit_logs` for platform-level Orbit actions — the schema allows null on this column.
- The Orbit sidebar "Back to App" link: if the superadmin has a workspace, link to `/{first-workspace-slug}`; else link to `/onboarding`. Resolved server-side in the layout.
- No separate database connection or schema for Orbit — everything in the same PostgreSQL instance, same Drizzle client.
- Orbit has no public-facing pages and is not linked from any marketing or workspace UI — accessed only by navigating to `/orbit` directly.

### Edge cases (implementation handling)

| Case | Handling |
| --- | --- |
| Superadmin navigates to Orbit with no workspaces in DB | Dashboard shows all-zero stat cards — no error |
| Superadmin tries to delete an already-deleted workspace | 404 from API |
| Superadmin tries to revoke their own superadmin | API returns 400: "Cannot revoke your own superadmin access" |
| Impersonation cookie expires mid-session | Next request: cookie missing → banner not shown → back to normal session. No explicit logout |
| Two superadmins impersonate the same user simultaneously | Both allowed — read-mostly for debugging. No lock |
| `ORBIT_SEED_EMAIL` set but email is already a superadmin | `INSERT ON CONFLICT DO NOTHING` — idempotent |
| Feature flag key not in `feature_flags` table | `isFeatureEnabled()` returns `true` (opt-out model) |
| `isFeatureEnabled()` DB query fails | Falls back to `true` — error logged. Fail-open |
| Superadmin visits suspended workspace | `is_suspended` check skipped for superadmins — full workspace visible |
| Non-superadmin discovers `/orbit` URL | Layout returns `notFound()` → 404, Orbit's existence not revealed |
| pg-boss table not found (worker not started) | `getJobQueueStatus()` catches the error, returns `{ active: [], failed: [], error: "Queue not initialized" }` |

### Database schema

The `superadmins`, `feature_flags`, `plans`, `workspace_plan_assignments` tables and the `workspaces` suspension columns (`is_suspended`, `suspended_at`, `suspended_by`, `plan_id`) are defined in [../DATABASE.md](../DATABASE.md). The `platform_settings` table remains in the schema but is no longer read or written by any code path — the Platform Settings admin page was removed.
