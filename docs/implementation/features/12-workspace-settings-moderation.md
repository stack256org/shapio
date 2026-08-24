> Implementation reference for Feature 12 — Workspace Settings & Moderation. Product behaviour: ../../features/12-workspace-settings-moderation.md

This document captures the technical detail removed from the product specification. For the canonical schema see [DATABASE.md](../DATABASE.md); for outbound webhook delivery and background jobs see [JOBS.md](../JOBS.md). Those files are the source of truth — the tables and jobs below are summarised here only as they relate to Feature 12, not duplicated.

Role note: in the product model these are all **Brand Admin** actions. Internally the workspace role is stored as `owner` or `admin`, both of which map to Brand Admin (`requireRole(['owner', 'admin'])`). `member` maps to Team Member.

> **Implemented (Phase 3 — settings are Brand-Admin-only).** All workspace settings pages now return not-found for Team Members. The previously-leaky pages (`settings/general`, `settings/members`, `settings/members/invites`, `settings/categories`, `settings/statuses`) were tightened from `if (!member)` to `if (!member || member.role === WORKSPACE_MEMBER)` — matching `moderation`, `webhooks`, `api-keys`, and `audit-log`, which already did this. The workspace sidebar now shows the workspace-config settings links only when `isAdminOrOwner`; personal settings (Notifications, Account) stay visible to all members. Moderation **configuration** (approval mode, spam keywords, blocked users) remains Brand-Admin-only; item-level clean-up (deleting posts/comments) is a Team Member capability performed from the board/post views (see Features 05 & 07).

---

## Dependencies

```
No new npm packages. Uses lib/encrypt.ts (AES-256-GCM, already in lib/) for webhook secrets.
```

## Environment Variables

```
ENCRYPTION_KEY=""   # AES-256 key for webhook secret encryption — openssl rand -hex 32
```

---

## Database Schema

See [DATABASE.md](../DATABASE.md) for the authoritative definitions. Feature 12 introduces / uses:

### `blocked_users`

```ts
id            text        PK  (cuid2)
workspace_id  text        NOT NULL  → workspaces.id (CASCADE DELETE)
user_id       text                  → user.id (SET NULL on delete)
user_email    text                  -- stored for guest blocks or fallback
user_name     text                  -- snapshot of name at time of block
blocked_by    text        NOT NULL  → user.id
reason        text                  -- optional admin note
created_at    timestamp   NOT NULL  DEFAULT now()
```

**Constraints:**
- `UNIQUE (workspace_id, user_id)` WHERE `user_id IS NOT NULL`
- `UNIQUE (workspace_id, user_email)` WHERE `user_email IS NOT NULL`

**Indexes:** `workspace_id`, `user_id`, `user_email`

---

### `audit_logs`

```ts
id            text        PK  (cuid2)
workspace_id  text                  → workspaces.id (CASCADE DELETE)  -- null for platform-level Orbit actions
actor_id      text        NOT NULL  → user.id
actor_name    text        NOT NULL  -- snapshot of actor name
action        text        NOT NULL  -- see Action Reference table
entity_type   text        NOT NULL  -- 'post' | 'board' | 'member' | 'category' | 'workspace' | 'invite' | 'comment'
entity_id     text                  -- ID of affected entity (null if entity deleted)
entity_name   text                  -- snapshot of entity name/title at time of action
metadata      jsonb                 -- action-specific extra data
created_at    timestamp   NOT NULL  DEFAULT now()
```

**Indexes:**
- `(workspace_id, created_at DESC)` — audit log list
- `actor_id`
- `entity_type`

---

### `outbound_webhook_endpoints`

```ts
id                    text        PK  (cuid2)
workspace_id          text        NOT NULL  → workspaces.id (CASCADE DELETE)
url                   text        NOT NULL  -- HTTPS only
encrypted_secret      text        NOT NULL  -- AES-256-GCM encrypted HMAC secret
events                text[]      NOT NULL  DEFAULT []  -- subscribed event keys
is_enabled            boolean     NOT NULL  DEFAULT true
consecutive_failures  integer     NOT NULL  DEFAULT 0
disabled_reason       text                  -- 'consecutive_failures' | 'manual'
created_at            timestamp   NOT NULL  DEFAULT now()
updated_at            timestamp   NOT NULL  DEFAULT now()
```

**Indexes:** `workspace_id`

---

### `outbound_webhook_deliveries`

```ts
id              text        PK  (cuid2)
endpoint_id     text        NOT NULL  → outbound_webhook_endpoints.id (CASCADE DELETE)
event           text        NOT NULL  -- e.g. 'post.status_changed'
payload         jsonb       NOT NULL  -- full event payload sent
status          text        NOT NULL  -- 'pending' | 'delivered' | 'failed'
attempts        integer     NOT NULL  DEFAULT 0
response_status integer               -- HTTP response code received
last_error      text                  -- last delivery error message
created_at      timestamp   NOT NULL  DEFAULT now()
```

**Retention:** Pruned after 30 days by the `CLEANUP_WEBHOOK_DELIVERIES` cron (runs nightly at 4am UTC — see [JOBS.md](../JOBS.md) / Feature 11 scheduler).

**Indexes:** `(endpoint_id, created_at DESC)` — delivery log query

---

### `api_keys`

```ts
id            text        PK  (cuid2)
workspace_id  text        NOT NULL  → workspaces.id (CASCADE DELETE)
user_id       text        NOT NULL  → user.id (SET NULL on delete)
name          text        NOT NULL  -- human label e.g. "Zapier Integration"
token_hash    text        NOT NULL UNIQUE  -- SHA-256 of raw key
last_used_at  timestamp             -- updated on every validated request
is_enabled    boolean     NOT NULL  DEFAULT true
created_at    timestamp   NOT NULL  DEFAULT now()
```

**Key format:** `ir_live_{cuid2}` — prefix identifies environment, cuid2 provides entropy.
**Storage:** Only `token_hash` (SHA-256) is stored. Raw key shown once to user at creation, then discarded.

**Indexes:** `workspace_id`, `token_hash` (API authentication lookup — hot path)

---

### `workspace_embed_config`

```ts
workspace_id  text        PK        → workspaces.id (CASCADE DELETE)  -- one row per workspace
board_id      text                  → boards.id (SET NULL)   -- which board the widget embeds; nullable
                                                               -- (no public board yet, or it was deleted)
mode          text        NOT NULL  DEFAULT 'inline'        -- 'inline' | 'button'
position      text        NOT NULL  DEFAULT 'bottom-right'  -- 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
theme         text        NOT NULL  DEFAULT 'light'          -- 'light' | 'dark' | 'auto'
width         integer     NOT NULL  DEFAULT 380
height        integer     NOT NULL  DEFAULT 560
accent_color  text        NOT NULL  DEFAULT '#111111'
updated_at    timestamp   NOT NULL  DEFAULT now()
```

No separate `id` column — same one-row-per-entity shape as `notification_preferences` (Feature 11), upserted via `onConflictDoUpdate` on `workspace_id`.

---

### `workspaces` columns used (already exist from Feature 02)

```ts
moderation_mode     text    NOT NULL  DEFAULT 'off'   -- 'off' | 'auto' | 'manual'
comment_moderation  boolean NOT NULL  DEFAULT false
spam_keywords       text[]  NOT NULL  DEFAULT []
```

---

## Audit Log Action Reference

| Action | Entity Type | Metadata |
|---|---|---|
| `post.status_changed` | `post` | `{ from: string, to: string, note: string }` |
| `post.merged` | `post` | `{ targetPostId: string, targetTitle: string }` |
| `post.deleted` | `post` | `{ title: string, boardName: string }` |
| `post.moved` | `post` | `{ fromBoardId: string, toBoardId: string }` |
| `post.pinned` | `post` | `{ isPinned: boolean }` |
| `post.approved` | `post` | `{}` |
| `board.created` | `board` | `{ name: string, slug: string }` |
| `board.archived` | `board` | `{ archived: boolean }` |
| `board.deleted` | `board` | `{ name: string }` |
| `board.settings_updated` | `board` | `{ changes: object }` |
| `member.invited` | `member` | `{ email: string, role: string }` |
| `member.role_changed` | `member` | `{ from: string, to: string }` |
| `member.removed` | `member` | `{ name: string, email: string }` |
| `member.ownership_transferred` | `member` | `{ newOwnerId: string, newOwnerName: string }` |
| `category.created` | `category` | `{ name: string, color: string }` |
| `category.updated` | `category` | `{ changes: object }` |
| `category.deleted` | `category` | `{ name: string }` |
| `workspace.settings_updated` | `workspace` | `{ changes: object }` |
| `moderation.mode_changed` | `workspace` | `{ from: string, to: string }` |
| `moderation.user_blocked` | `workspace` | `{ targetEmail: string, reason: string }` |
| `moderation.user_unblocked` | `workspace` | `{ targetEmail: string }` |
| `comment.deleted` | `comment` | `{ postTitle: string }` |
| `webhook.created` | `webhook` | `{ url: string, events: string[] }` |
| `webhook.updated` | `webhook` | `{ changes: object }` |
| `webhook.deleted` | `webhook` | `{ url: string }` |
| `webhook.disabled` | `webhook` | `{ reason: string }` |
| `api_key.created` | `api_key` | `{ name: string }` |
| `api_key.revoked` | `api_key` | `{ name: string }` |

---

## File Structure

```
app/
└── (workspace)/
    └── [ws-slug]/
        └── settings/
            ├── layout.tsx                      Settings layout (sidebar nav)
            ├── general/
            │   └── page.tsx                    General settings (Feature 02 + logo stub)
            ├── members/
            │   └── page.tsx                    Members settings (Feature 03)
            ├── categories/
            │   └── page.tsx                    Categories settings (Feature 08)
            ├── moderation/
            │   └── page.tsx                    NEW — moderation settings
            ├── webhooks/
            │   └── page.tsx                    NEW — outbound webhook endpoints
            ├── api-keys/
            │   └── page.tsx                    NEW — API key management
            ├── embed/
            │   ├── page.tsx                    NEW — embed widget configuration
            │   └── layout.tsx                  NEW — section header
            └── audit-log/
                └── page.tsx                    NEW — audit log viewer
└── api/
    └── workspaces/
        └── [slug]/
            ├── moderation/
            │   └── route.ts                    PATCH moderation settings
            ├── blocked-users/
            │   ├── route.ts                    GET list / POST block user
            │   └── [blockedId]/
            │       └── route.ts                DELETE unblock user
            ├── webhooks/
            │   ├── route.ts                    GET list / POST create endpoint
            │   └── [endpointId]/
            │       └── route.ts                PATCH update / DELETE remove
            ├── api-keys/
            │   ├── route.ts                    GET list / POST generate key
            │   └── [keyId]/
            │       └── route.ts                DELETE revoke key
            └── audit-log/
                └── route.ts                    GET audit log (paginated)

components/
└── settings/
    ├── settings-layout.tsx                     Sidebar + content wrapper
    ├── settings-nav.tsx                        Vertical nav links
    ├── moderation-settings-form.tsx            Approval mode + comment mod + spam keywords
    ├── spam-keywords-editor.tsx                Tag-style keyword list editor
    ├── blocked-users-table.tsx                 List of blocked users + unblock action
    ├── block-user-form.tsx                     Add user to blocklist by email
    ├── pending-posts-section.tsx               Posts awaiting approval (moderation queue)
    ├── webhook-endpoints-table.tsx             Webhook endpoint list + enable/disable/delete
    ├── webhook-endpoint-form.tsx               Create/edit endpoint (URL + event checkboxes)
    ├── webhook-delivery-log.tsx                Last 100 deliveries per endpoint
    ├── api-keys-table.tsx                      Key list with name, last used, revoke button
    ├── embed-section.tsx                       Embed settings form + live snippet generator
    └── audit-log-table.tsx                     Read-only audit log list

lib/
├── moderation/
│   ├── block.ts                                Block / unblock service
│   ├── queries.ts                              isBlocked check, list blocked
│   └── index.ts
├── webhooks/
│   ├── dispatch.ts                             dispatchWebhookEvent(workspaceId, event, payload)
│   ├── events.ts                               WEBHOOK_EVENTS enum + labels
│   ├── payloads.ts                             Typed payload builders per event
│   └── queries.ts                              listEndpoints, listDeliveries
├── api-keys/
│   ├── create.ts                               generateApiKey() — returns raw key once
│   ├── validate.ts                             validateApiKey() — hash lookup + last_used_at update
│   └── queries.ts
├── embed/
│   ├── queries.ts                              getEmbedConfig / upsertEmbedConfig
│   └── style.ts                                parseEmbedParams / buildEmbedQuery / embedWrapperProps
│                                                — shared by the 3 embed-aware public pages to apply
│                                                theme + accent color from the iframe's query string
└── audit/
    ├── log.ts                                  createAuditLog() helper
    ├── queries.ts                              listAuditLogs()
    └── index.ts
```

---

## Service Layer

### `lib/audit/log.ts`

```ts
createAuditLog({
  workspaceId,
  actorId,
  actorName,
  action,
  entityType,
  entityId?,
  entityName?,
  metadata?,
})
  → inserts audit_logs row
  → fire-and-forget (never awaited in critical path — does not block main action)
  → on error: console.error only — audit log failure never blocks the action
  → returns void
```

**Usage pattern across all service functions:**
```ts
// In changeStatus():
await updatePostStatus(...)
createAuditLog({             // not awaited
  workspaceId,
  actorId: changedBy,
  actorName: actor.name,
  action: "post.status_changed",
  entityType: "post",
  entityId: postId,
  entityName: post.title,
  metadata: { from: fromStatus, to: toStatus, note },
})
```

### `lib/audit/queries.ts`

```ts
listAuditLogs(workspaceId, {
  page = 1,
  limit = 50,
  actorId?,      -- filter by actor
  entityType?,   -- filter by entity type
  action?,       -- filter by action
})
  → SELECT * FROM audit_logs WHERE workspace_id = workspaceId
  → apply filters if provided
  → ORDER BY created_at DESC
  → LIMIT/OFFSET pagination
  → returns { logs: AuditLog[], total, hasMore }
```

### `lib/moderation/block.ts`

```ts
blockUser(workspaceId, blockedBy, { userEmail, reason? })
  → look up user by email (from user table)
  → if found: userId = user.id, userName = user.name
  → if not found (guest): userId = null, userName = email
  → check not already blocked: UNIQUE constraint handles race
  → INSERT INTO blocked_users { workspaceId, userId, userEmail, userName, blockedBy, reason }
  → createAuditLog({ action: 'moderation.user_blocked', ... })
  → returns blocked_user row

unblockUser(blockedId, workspaceId)
  → DELETE FROM blocked_users WHERE id = blockedId AND workspace_id = workspaceId
  → createAuditLog({ action: 'moderation.user_unblocked', ... })
  → returns void

isBlocked(workspaceId, { userId?, userEmail? })
  → SELECT 1 FROM blocked_users WHERE workspace_id = workspaceId
    AND (user_id = userId OR user_email = userEmail)
  → returns boolean
  → called in createPost() and createComment() pre-flight checks
```

### `lib/api-keys/create.ts`

```ts
generateApiKey(workspaceId, userId, name)
  → rawKey = `ir_live_${createId()}`  -- cuid2 for entropy
  → tokenHash = sha256(rawKey)
  → INSERT INTO api_keys { workspaceId, userId, name, tokenHash }
  → createAuditLog({ action: 'api_key.created', ... })
  → returns { id, name, rawKey }  -- rawKey returned ONCE, never stored
```

### `lib/api-keys/validate.ts`

```ts
validateApiKey(rawKey)
  → tokenHash = sha256(rawKey)
  → SELECT * FROM api_keys WHERE token_hash = tokenHash AND is_enabled = true
  → if found: UPDATE api_keys SET last_used_at = now()
  → returns { workspaceId, userId } | null
  → Used in API route middleware: Authorization: Bearer <rawKey>
```

### `lib/embed/queries.ts` and `lib/embed/style.ts`

```ts
getEmbedConfig(workspaceId) → row | null                 -- SELECT by workspace_id
upsertEmbedConfig(workspaceId, config) → row              -- onConflictDoUpdate on workspace_id

// Pure helpers shared by the 3 public embed-aware pages (board list, post
// detail, new-post) — no DB access, no Next.js dependency:
parseEmbedParams({ embed, theme, accentColor })
  → { isEmbed, theme?: 'light'|'dark', accentColor? }     -- validates hex + enum, "auto"/garbage → undefined
buildEmbedQuery(parsed) → "" | "?embed=1&theme=...&accentColor=..."
  → used to build every internal link so embed mode survives navigation
embedWrapperProps(parsed) → { className, style }
  → className: "dark" when theme is forced dark (the app has no OS-preference
    media query — "auto" intentionally falls back to the default light render)
  → style: --primary / --primary-foreground overrides computed from accentColor
    via a simple sRGB luminance check, so primary actions (vote button, "New
    post") pick up the workspace's accent color
```

`public/widget.js` mirrors the same validation (position/theme/accent-color
allow-lists, hex regex) client-side before writing `data-*` attributes into
the iframe's query string — it has no shared module with `lib/embed/style.ts`
since it ships as a standalone script with no build step, so the two are kept
in sync by hand.

---

## Outbound Webhook Delivery

See [JOBS.md](../JOBS.md) for the queue, retry policy, and the full event catalogue. Feature-12-specific mechanics:

### `lib/webhooks/dispatch.ts`

```ts
dispatchWebhookEvent(workspaceId, event, payload)
  → SELECT enabled endpoints WHERE workspace_id = workspaceId AND event = ANY(events)
  → for each endpoint:
      INSERT INTO outbound_webhook_deliveries { endpointId, event, payload, status: 'pending' }
      await queue.send(JOB_NAMES.DELIVER_OUTBOUND_WEBHOOK, { deliveryId: row.id })
  → returns void (fire-and-forget — never awaited in service functions)
```

Called from service functions after the primary mutation succeeds:
```ts
// In createPost():
const post = await insertPost(...)
dispatchWebhookEvent(workspaceId, "post.created", buildPostPayload(post))  // not awaited
```

### `lib/worker/handlers/deliver-outbound-webhook.ts`

```ts
handler: async ({ data: { deliveryId } }) => {
  const delivery = await claimDelivery(deliveryId)  // atomic status: pending → sending
  if (!delivery) return  // already processing

  const endpoint = await getEndpoint(delivery.endpointId)
  if (!endpoint.isEnabled) return  // endpoint disabled mid-flight

  const timestamp = Math.floor(Date.now() / 1000)
  const rawBody = JSON.stringify(delivery.payload)
  const secret = decrypt(endpoint.encryptedSecret)  // AES-256-GCM
  const sig = `t=${timestamp},v1=${hmacSha256(secret, `${timestamp}.${rawBody}`)}`

  // SSRF guard: resolve URL, block RFC 1918 / loopback / link-local
  await assertNotSsrf(endpoint.url)

  const res = await fetch(endpoint.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-IdeaRoads-Signature": sig,
    },
    body: rawBody,
    signal: AbortSignal.timeout(10_000),  // 10s timeout per attempt
  })

  if (res.ok) {
    await markDelivered(deliveryId, res.status)
    await resetFailureCount(endpoint.id)
  } else {
    await markFailed(deliveryId, res.status, await res.text())
    const newCount = await incrementFailureCount(endpoint.id)
    if (newCount >= 50) {
      await disableEndpoint(endpoint.id, "consecutive_failures")
      // enqueue email to workspace owner
    }
    throw new Error(`HTTP ${res.status}`)  // let pg-boss retry (up to retryLimit: 5)
  }
}
```

### Signature & replay protection

- Header: `X-IdeaRoads-Signature: t=<unix>,v1=<hmac-sha256-hex>`
- Signature covers `{timestamp}.{rawBody}` with a 300-second replay protection window.
- Webhook secrets are stored encrypted (AES-256-GCM via `lib/encrypt.ts`) and never returned in API responses after creation.
- Delivery log: last 100 deliveries per endpoint — HTTP status code, response body (truncated to 1KB), attempt count.
- Auto-disable at 50 consecutive failures; email sent to the workspace owner. Manual re-enable resets the failure counter.
- "Test" button sends a `ping` event to the endpoint immediately.

### Event keys

`post.created`, `post.status_changed`, `post.merged`, `post.deleted`, `comment.created`, `vote.cast`, `member.joined`, `member.removed`, `changelog.published`

---

## API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| PATCH | `/api/workspaces/[slug]/moderation` | `requireRole(['owner','admin'])` | Update moderation settings |
| GET | `/api/workspaces/[slug]/blocked-users` | `requireRole(['owner','admin'])` | List blocked users |
| POST | `/api/workspaces/[slug]/blocked-users` | `requireRole(['owner','admin'])` | Block a user |
| DELETE | `/api/workspaces/[slug]/blocked-users/[id]` | `requireRole(['owner','admin'])` | Unblock a user |
| GET | `/api/workspaces/[slug]/audit-log` | `requireRole(['owner','admin'])` | List audit log entries |

### `app/api/workspaces/[slug]/moderation/route.ts`

**PATCH** — Update moderation settings
```
Auth: requireRole(['owner', 'admin'])
Body: {
  moderationMode?: 'off' | 'auto' | 'manual'
  commentModeration?: boolean
  spamKeywords?: string[]
}
Validates:
  - moderationMode: must be valid enum value if provided
  - spamKeywords: array of strings, each 1–100 chars, max 50 keywords
Logic:
  - UPDATE workspaces SET moderation_mode, comment_moderation, spam_keywords, updated_at
  - createAuditLog for mode change if moderationMode changed
Returns: updated workspace (moderation fields only)
```

### `app/api/workspaces/[slug]/blocked-users/route.ts`

**GET** — List blocked users
```
Auth: requireRole(['owner', 'admin'])
Returns: blocked_user[] (id, userName, userEmail, reason, blockedAt, blockedByName)
```

**POST** — Block a user
```
Auth: requireRole(['owner', 'admin'])
Body: { email: string, reason?: string }
Validates:
  - email: valid format
  - user not already blocked
  - cannot block yourself
  - cannot block the workspace owner
Calls: blockUser(...)
Returns: 201 + blocked_user
```

### `app/api/workspaces/[slug]/blocked-users/[blockedId]/route.ts`

**DELETE** — Unblock user
```
Auth: requireRole(['owner', 'admin'])
Calls: unblockUser(blockedId, workspaceId)
Returns: 204
```

### `app/api/workspaces/[slug]/audit-log/route.ts`

**GET** — List audit log
```
Auth: requireRole(['owner', 'admin'])
Query: page=1, limit=50, actorId?, entityType?, action?
Returns: { logs: AuditLog[], total, hasMore }
```

### Block enforcement at the API edge

The API returns **403** for blocked users — not 200 with an error message — so there is no ambiguity at the client.

---

## UI Components

### Settings layout — `app/(workspace)/[ws-slug]/settings/layout.tsx`

Server component — wraps all settings pages:

```
┌──────────────────────────────────────────────────────┐
│  Workspace Settings                                  │
│  ──────────────────────────────────────────────────  │
│  ┌─────────────┐  ┌────────────────────────────────┐ │
│  │  General    │  │                                │ │
│  │  Members    │  │   {children}                   │ │
│  │  Categories │  │   (active settings page)       │ │
│  │  Moderation │  │                                │ │
│  │  Audit Log  │  │                                │ │
│  └─────────────┘  └────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

- "Audit Log" and "Moderation" nav items shown to Brand Admin (`owner`/`admin`) only.
- All settings pages require `owner`/`admin` role (enforced in the layout). `member` (Team Member) → redirect to workspace dashboard.

### `components/settings/settings-nav.tsx`

Client component — vertical sidebar navigation:

```ts
const navItems = [
  { label: "General",    href: `/${wsSlug}/settings/general`,    icon: Settings },
  { label: "Members",    href: `/${wsSlug}/settings/members`,    icon: Users },
  { label: "Categories", href: `/${wsSlug}/settings/categories`, icon: Tag },
  { label: "Moderation", href: `/${wsSlug}/settings/moderation`, icon: Shield },
  { label: "Webhooks",   href: `/${wsSlug}/settings/webhooks`,   icon: Webhook },
  { label: "API Keys",   href: `/${wsSlug}/settings/api-keys`,   icon: Key },
  { label: "Audit Log",  href: `/${wsSlug}/settings/audit-log`,  icon: ClipboardList },
]
```

- Active item highlighted via `usePathname()`.

### Moderation page — `app/(workspace)/[ws-slug]/settings/moderation/page.tsx`

Server component — fetches workspace moderation fields, blocked users list, pending posts count. Renders `<ModerationSettingsForm />`, `<PendingPostsSection />`, `<BlockedUsersTable />` + `<BlockUserForm />`.

`components/settings/moderation-settings-form.tsx` — each section saved independently via separate Save buttons; PATCH `/api/workspaces/[slug]/moderation`; toast on success; embeds `<SpamKeywordsEditor />`.

`components/settings/spam-keywords-editor.tsx` — tag-style chips; add on Enter/comma, remove on ×; validates 1–100 chars each, max 50; does not auto-save (value passed to parent form).

`components/settings/pending-posts-section.tsx` — shown when `moderation_mode = 'manual'` OR `'auto'` with flagged posts; per-post Approve (PATCH `/api/posts/[postId]/approve`) and Delete (DELETE `/api/posts/[postId]`); refresh button. Reuses existing `listPosts()` with `{ includeUnapproved: true }`.

`components/settings/blocked-users-table.tsx` — columns Name/Email | Reason | Blocked By | Blocked At | Actions; Unblock → DELETE `/api/workspaces/[slug]/blocked-users/[id]`.

`components/settings/block-user-form.tsx` — email + optional reason; POST `/api/workspaces/[slug]/blocked-users`; error states "User not found" (allowed — blocks by email), "Already blocked".

### Audit log table — `components/settings/audit-log-table.tsx`

**Action description formatting:**
```ts
function formatAuditAction(log: AuditLog): string {
  switch (log.action) {
    case "post.status_changed":
      return `changed status of "${log.entityName}" from ${log.metadata.from} to ${log.metadata.to}`
    case "post.merged":
      return `merged "${log.entityName}" into "${log.metadata.targetTitle}"`
    case "post.deleted":
      return `deleted post "${log.metadata.title}" from ${log.metadata.boardName}`
    case "member.removed":
      return `removed member ${log.metadata.email}`
    case "moderation.user_blocked":
      return `blocked user ${log.metadata.targetEmail}`
    // ... etc
  }
}
```

- Filters: entity type, actor dropdown, date range (last 7/30 days, all time — no date picker in MVP).
- Pagination: "Load more" — 50 per page.

### General settings page

- Logo: stubbed in MVP — accepts a URL string only, no upload.
- Danger Zone (delete workspace) visible to the owner only; AlertDialog requires typing the workspace name.
- PATCH `/api/workspaces/[slug]` on save (existing endpoint from Feature 02).

---

## Audit Log Integration Points

`createAuditLog()` is added to all service functions across previous features:

| Service Function | Feature | Action Logged |
|---|---|---|
| `changeStatus()` | 08 | `post.status_changed` |
| `mergePosts()` | 05 | `post.merged` |
| `deletePost()` | 05 | `post.deleted` |
| `movePost()` | 05 | `post.moved` |
| `togglePin()` | 05 | `post.pinned` |
| `approvePost()` | 05 | `post.approved` |
| `createBoard()` | 04 | `board.created` |
| `toggleArchive()` | 04 | `board.archived` |
| `deleteBoard()` | 04 | `board.deleted` |
| `updateBoard()` | 04 | `board.settings_updated` |
| `createEmailInvite()` | 03 | `member.invited` |
| `changeRole()` | 03 | `member.role_changed` |
| `removeMember()` | 03 | `member.removed` |
| `transferOwnership()` | 03 | `member.ownership_transferred` |
| `createCategory()` | 08 | `category.created` |
| `updateCategory()` | 08 | `category.updated` |
| `deleteCategory()` | 08 | `category.deleted` |
| `updateWorkspace()` | 02 | `workspace.settings_updated` |
| `updateModerationSettings()` | 12 | `moderation.mode_changed` |
| `blockUser()` | 12 | `moderation.user_blocked` |
| `unblockUser()` | 12 | `moderation.user_unblocked` |
| `deleteComment()` (admin) | 07 | `comment.deleted` |

---

## Block Check Integration

`isBlocked()` is called in **pre-flight checks** in two service functions:

```ts
// In createPost() — lib/posts/create.ts
const blocked = await isBlocked(workspaceId, {
  userId: authorId ?? undefined,
  userEmail: authorEmail ?? undefined,
})
if (blocked) throw new Error("You are not allowed to post in this workspace.")

// In createComment() — lib/comments/create.ts
const blocked = await isBlocked(workspaceId, {
  userId: authorId ?? undefined,
  userEmail: authorEmail ?? undefined,
})
if (blocked) throw new Error("You are not allowed to comment in this workspace.")
```

---

## Validation Rules

| Field | Rules |
|---|---|
| `moderationMode` | Must be `'off'`, `'auto'`, or `'manual'` |
| `spamKeywords` | Array of strings, each 1–100 chars, max 50 items, no duplicates |
| Block `email` | Valid email format, not already blocked, not self, not workspace owner |
| Block `reason` | Optional, max 300 chars |
| Audit log `limit` | Max 50 per page |

---

## Implementation Notes

- `createAuditLog()` is **fire-and-forget** — it is NOT awaited in service functions. It runs as a best-effort background insert so audit logging never delays or breaks the primary action.
- The settings layout (`settings/layout.tsx`) enforces the role check — a `member` session is redirected to the workspace dashboard. This is the single enforcement point; individual settings pages do not re-check.
- `spam_keywords` is a PostgreSQL `text[]` column. Spam check uses substring matching: `SELECT EXISTS (SELECT 1 FROM unnest(spam_keywords) AS kw WHERE lower(postTitle) ILIKE '%' || lower(kw) || '%')`, so `"spam"` matches `"this is spam"`.
- `blocked_users.user_email` is stored even for signed-in users as a fallback — if their account is deleted, the email block remains active for guest submissions.
- The Pending Posts section reuses the existing `listPosts()` query with `{ includeUnapproved: true }` — no new query needed.
- Audit log `metadata` is `jsonb` with no fixed schema per action type; display logic must handle unknown fields gracefully with a fallback formatter.
- The settings layout is within the `(workspace)` route group, with access to workspace context (slug, name, member role) from the parent layout at `[ws-slug]/layout.tsx`.
- Edge-case mechanics: `blockUser()` with an unknown email creates a record with `user_id = null`; `user_id` is SET NULL on account deletion so the email block survives; self-block returns 400, owner-block returns 403; concurrent moderation saves are last-write-wins (no advisory lock).
