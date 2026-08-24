# IdeaRoads — Architecture, Routes & Conventions

> **Implementation reference — not product specification.**
> Folder layout, route groups, URL patterns, and engineering conventions. For product behaviour, see the product docs.

---

## Route Groups

```
app/
├── (marketing)/          Landing page — force-static, no auth
├── (auth)/               /signin, /signup, /post-auth
├── (public)/[ws-slug]/   Public workspace pages — boards, posts, roadmap, changelog
├── (workspace)/[ws-slug]/Admin workspace pages — settings, members, moderation
└── orbit/                Platform Admin panel — /orbit/*
```

---

## URL Patterns

| Page | URL |
|---|---|
| Landing | `/` |
| Sign In | `/signin` |
| Post-auth redirect | `/post-auth` |
| Onboarding | `/onboarding` |
| Public board | `/{ws-slug}/b/{board-slug}` |
| Post detail | `/{ws-slug}/b/{board-slug}/p/{postId}-{post-slug}` |
| Public roadmap | `/{ws-slug}/roadmap` |
| Public changelog | `/{ws-slug}/changelog` |
| Changelog RSS | `/{ws-slug}/changelog/feed.xml` |
| Workspace dashboard | `/{ws-slug}` |
| Settings | `/{ws-slug}/settings/general` |
| Moderation | `/{ws-slug}/settings/moderation` |
| Audit log | `/{ws-slug}/settings/audit-log` |
| Orbit dashboard | `/orbit` |
| Orbit workspaces | `/orbit/workspaces` |
| Orbit users | `/orbit/users` |
| Orbit feature flags | `/orbit/feature-flags` |
| Orbit job queue | `/orbit/jobs` |

---

## Folder Structure

```
idearoads/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                                  Landing page
│   │
│   ├── (auth)/
│   │   ├── signin/page.tsx                       Magic link + Google
│   │   └── signup/page.tsx                       Same as signin
│   │
│   ├── onboarding/page.tsx                       Create first workspace
│   ├── post-auth/page.tsx                        Redirect after login
│   ├── invite/[token]/page.tsx                   Email invite accept
│   ├── invite/link/[linkToken]/page.tsx          Link invite accept
│   │
│   ├── (workspace)/
│   │   └── [ws-slug]/
│   │       ├── layout.tsx                        Workspace layout (sidebar)
│   │       ├── page.tsx                          Dashboard
│   │       ├── b/
│   │       │   └── [board-slug]/
│   │       │       ├── page.tsx                  Admin board view
│   │       │       └── settings/page.tsx
│   │       ├── posts/page.tsx                    All posts (admin)
│   │       ├── changelog/
│   │       │   ├── page.tsx
│   │       │   ├── new/page.tsx
│   │       │   └── [id]/edit/page.tsx
│   │       ├── notifications/page.tsx
│   │       └── settings/
│   │           ├── layout.tsx                    Settings sidebar nav
│   │           ├── general/page.tsx
│   │           ├── members/page.tsx
│   │           ├── categories/page.tsx
│   │           ├── moderation/page.tsx
│   │           ├── webhooks/page.tsx             Outbound webhooks
│   │           ├── api-keys/page.tsx             API key management
│   │           └── audit-log/page.tsx            Admin action history
│   │
│   ├── (public)/
│   │   └── [ws-slug]/
│   │       ├── b/
│   │       │   └── [board-slug]/
│   │       │       ├── page.tsx                  Public board
│   │       │       └── p/[postId]/page.tsx       Post detail + comments
│   │       ├── roadmap/page.tsx                  Public roadmap
│   │       └── changelog/
│   │           ├── page.tsx                      Public changelog
│   │           └── feed.xml/route.ts             RSS feed
│   │
│   ├── orbit/
│   │   ├── layout.tsx                            Orbit layout (superadmin check → 404)
│   │   ├── page.tsx                              Platform dashboard
│   │   ├── workspaces/
│   │   │   ├── page.tsx
│   │   │   └── [workspaceId]/page.tsx
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   └── [userId]/page.tsx
│   │   ├── plans/page.tsx                        Plan catalog editor
│   │   ├── settings/page.tsx                     Platform settings
│   │   ├── feature-flags/page.tsx
│   │   ├── jobs/page.tsx                         pg-boss queue status
│   │   └── audit-log/page.tsx                    Platform-level audit log
│   │
│   └── api/
│       ├── auth/[...all]/route.ts
│       ├── workspaces/
│       │   ├── route.ts
│       │   └── [slug]/
│       │       ├── route.ts
│       │       ├── members/
│       │       │   ├── route.ts
│       │       │   ├── me/route.ts
│       │       │   └── [memberId]/route.ts
│       │       ├── invites/route.ts
│       │       ├── boards/route.ts
│       │       ├── categories/route.ts
│       │       ├── moderation/route.ts
│       │       ├── blocked-users/
│       │       │   ├── route.ts
│       │       │   └── [id]/route.ts
│       │       ├── webhooks/
│       │       │   ├── route.ts
│       │       │   └── [endpointId]/route.ts
│       │       ├── api-keys/
│       │       │   ├── route.ts
│       │       │   └── [keyId]/route.ts
│       │       ├── audit-log/route.ts
│       │       └── changelog/
│       │           ├── route.ts
│       │           └── [id]/route.ts
│       ├── boards/
│       │   └── [boardId]/
│       │       ├── route.ts
│       │       └── posts/route.ts
│       ├── posts/
│       │   └── [postId]/
│       │       ├── route.ts
│       │       ├── vote/route.ts
│       │       ├── approve/route.ts
│       │       ├── status/route.ts
│       │       ├── pin/route.ts
│       │       ├── merge/route.ts
│       │       ├── move/route.ts
│       │       └── comments/route.ts
│       ├── comments/
│       │   └── [commentId]/route.ts
│       ├── notifications/
│       │   ├── route.ts
│       │   └── count/route.ts
│       └── orbit/
│           ├── stats/route.ts
│           ├── workspaces/
│           │   ├── route.ts
│           │   └── [id]/
│           │       ├── route.ts
│           │       └── unsuspend/route.ts
│           ├── users/
│           │   ├── route.ts
│           │   └── [id]/
│           │       ├── route.ts
│           │       └── impersonate/route.ts
│           ├── end-impersonation/route.ts
│           ├── feature-flags/
│           │   ├── route.ts
│           │   └── [key]/route.ts
│           ├── plans/
│           │   ├── route.ts
│           │   └── [id]/route.ts
│           ├── settings/route.ts
│           └── jobs/route.ts
│
├── components/
│   ├── ui/                         button, input, label, card, badge,
│   │                               dialog, select, dropdown-menu,
│   │                               textarea, avatar, separator,
│   │                               sonner toaster, tabs, tooltip, switch, sheet
│   ├── providers.tsx               ThemeProvider + Toaster (sonner)
│   ├── impersonate-banner.tsx      Shown site-wide during impersonation sessions
│   ├── layout/
│   │   ├── navbar.tsx
│   │   ├── workspace-nav.tsx
│   │   └── workspace-switcher.tsx
│   ├── posts/
│   │   ├── post-card.tsx
│   │   ├── vote-button.tsx
│   │   ├── status-badge.tsx
│   │   ├── submit-post-modal.tsx
│   │   ├── admin-post-toolbar.tsx
│   │   ├── merge-post-modal.tsx
│   │   └── move-post-modal.tsx
│   ├── comments/
│   │   ├── comment-thread.tsx
│   │   └── comment-form.tsx
│   ├── boards/
│   │   ├── board-card.tsx
│   │   └── create-board-modal.tsx
│   ├── changelog/
│   │   ├── changelog-entry-card.tsx
│   │   └── changelog-form.tsx
│   ├── notifications/
│   │   └── notification-bell.tsx
│   ├── settings/
│   │   ├── settings-nav.tsx
│   │   ├── moderation-settings-form.tsx
│   │   ├── spam-keywords-editor.tsx
│   │   ├── blocked-users-table.tsx
│   │   ├── block-user-form.tsx
│   │   ├── pending-posts-section.tsx
│   │   ├── audit-log-table.tsx
│   │   ├── webhook-endpoints-table.tsx
│   │   ├── webhook-endpoint-form.tsx
│   │   └── api-keys-table.tsx
│   └── orbit/
│       ├── orbit-sidebar.tsx
│       ├── orbit-stat-card.tsx
│       ├── workspace-table.tsx
│       ├── user-table.tsx
│       ├── feature-flag-list.tsx
│       ├── plan-form-sheet.tsx
│       ├── job-queue-table.tsx
│       └── impersonate-banner.tsx
│
├── db/
│   ├── index.ts                  Drizzle client (pg pool singleton)
│   ├── migrations/               Auto-generated SQL (drizzle-kit — never hand-write)
│   └── schema/
│       ├── auth.ts               Better Auth tables
│       ├── workspaces.ts         workspaces, workspace_members, workspace_invites
│       ├── boards.ts
│       ├── posts.ts              posts, post_status_changes
│       ├── votes.ts
│       ├── comments.ts
│       ├── changelog.ts          changelog_entries, changelog_posts
│       ├── notifications.ts
│       ├── email-outbox.ts       email_outbox (durable email queue)
│       ├── moderation.ts         blocked_users, audit_logs
│       ├── webhooks.ts           outbound_webhook_endpoints, outbound_webhook_deliveries
│       ├── api-keys.ts           api_keys
│       ├── orbit.ts              superadmins, feature_flags, platform_settings
│       └── index.ts              Re-exports all tables
│
├── lib/
│   ├── auth.ts                   Better Auth server config
│   ├── auth-client.ts            Better Auth client
│   ├── env.ts                    Zod env validation — validates all process.env at startup
│   ├── encrypt.ts                AES-256-GCM encrypt/decrypt (webhook secrets, API key display)
│   ├── utils.ts                  cn(), slugify(), formatDate(), uniqueSlug()
│   ├── api/
│   │   └── auth-helpers.ts       requireSession, requireWorkspaceMember, requireRole
│   ├── email/
│   │   ├── index.ts              enqueueEmail() — inserts email_outbox row + enqueues SEND_EMAIL job
│   │   ├── renderer.ts           React Email component → HTML string (server-side only)
│   │   └── templates/            React Email components
│   ├── workspaces/               workspace.ts, members.ts, invites.ts
│   ├── boards/                   queries.ts, create.ts, update.ts, delete.ts
│   ├── posts/                    queries.ts, create.ts, update.ts, delete.ts, merge.ts
│   ├── voting/                   cast.ts, remove.ts, list.ts
│   ├── comments/                 queries.ts, create.ts, delete.ts
│   ├── changelog/                queries.ts, create.ts, publish.ts
│   ├── notifications/            create.ts, queries.ts
│   ├── audit/                    log.ts (fire-and-forget), queries.ts
│   ├── moderation/               block.ts, queries.ts
│   ├── webhooks/                 dispatch.ts, events.ts, payloads.ts, queries.ts
│   ├── api-keys/                 create.ts, validate.ts, queries.ts
│   ├── orbit/                    auth.ts, stats.ts, workspaces.ts, users.ts,
│   │                             feature-flags.ts, plans.ts, settings.ts, jobs.ts
│   └── worker/
│       ├── job-types.ts          JOB_NAMES enum
│       ├── queue.ts              pg-boss singleton (getQueue())
│       ├── startup.ts            Register all handlers + crons
│       └── handlers/             One handler per job (see JOBS.md)
│
├── hooks/
│   ├── use-mutation.ts           Server action wrapper (loading + optimistic updates)
│   └── use-toast.ts              Sonner toast wrapper
│
├── config/
│   └── platform.ts               MAX_BOARDS_PER_WORKSPACE, RESERVED_SLUGS,
│                                 DELETED_COMMENT_BODY, WEBHOOK_EVENTS, etc.
│
├── middleware.ts                  Protect /[ws-slug]/*, /orbit/* routes
├── docker-compose.yml             PostgreSQL + App
├── biome.json                     Linting + formatting config
├── .env.example
├── LICENSE                        MIT
└── README.md
```

---

## Patterns & Conventions

### Durable Email Outbox
Never send email directly from service functions. Always:
1. `enqueueEmail({ to, subject, html })` → inserts `email_outbox` row (status=queued) + enqueues `SEND_EMAIL` job.
2. Worker processes the job: atomically `queued → sending → sent` (or `failed` with error).
3. If the app crashes between insert and send, the row survives. `CLEANUP_EMAIL_OUTBOX` cron re-queues any stuck rows.

```ts
// Correct — durable
await enqueueEmail({ to: user.email, subject: "...", html: renderedHtml })

// Wrong — not durable, no retry, no audit trail
await transporter.sendMail({ to: user.email, ... })
```

### Idempotent Job Handlers
Every handler is safe to retry:
1. Read current entity state.
2. Check if action already completed (state guard) — if yes, return early (no-op).
3. Acquire advisory lock if mutating shared state.
4. Perform mutation inside `db.transaction()`.
5. Call `createAuditLog()` (fire-and-forget, not awaited).

### Advisory Locks
Use `pg_advisory_xact_lock(hashtext(id)::bigint)` inside `db.transaction()` for any mutation that must be serialized per-entity (member mutations, vote counters, subscription state transitions).

### Audit Log — Fire and Forget
`createAuditLog()` is **never awaited**. It is a best-effort background insert. Audit log failure never blocks or rolls back the primary action.

### Zod Environment Validation
All `process.env` accesses go through `lib/env.ts`, validated at startup with Zod — the app fails fast on missing/malformed vars.

### Import Alias
Always use the `@/` alias — never relative paths. Configured in `tsconfig.json`.

### `use-mutation` Hook
All client-side calls to Server Actions go through `hooks/use-mutation.ts`, which handles loading state, error state, optimistic updates, and sonner toasts.

### React Email Templates
All email HTML is generated from React Email components (server-side only). Never build HTML strings manually.

### Biome (Linting + Formatting)
Biome replaces both ESLint and Prettier. Single config file:

```
pnpm lint        → biome check .
pnpm lint:fix    → biome check --write .
pnpm format      → biome format --write .
```

A pre-push git hook runs `biome check` — commits are blocked if lint fails.

### Feature Flag Checks
```ts
import { isFeatureEnabled } from "@/lib/orbit/feature-flags"
const guestVotingEnabled = await isFeatureEnabled("guest_voting")
// Cached 60 seconds. Returns true if flag not found (opt-out model).
```
