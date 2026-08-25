> Implementation reference for Feature 11 — Notifications. Product behaviour: [../../features/11-notifications.md](../../features/11-notifications.md)

# Feature 11 — Notifications (Implementation Reference)

This document captures the technical implementation detail for the Notifications feature: API endpoints, notification events, email delivery, in-app polling, unsubscribe, background jobs, and engineering notes. For **what the feature does** (product behaviour, flows, acceptance criteria), see the product spec linked above.

Schema definitions are authoritative in [`../DATABASE.md`](../DATABASE.md) (`notifications`, `email_outbox`, `email_preferences`). The job queue and the full job list are authoritative in [`../JOBS.md`](../JOBS.md). This file does not duplicate them.

---

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | Session | List notifications (paginated) |
| PATCH | `/api/notifications` | Session | Mark all as read |
| GET | `/api/notifications/count` | Session | Get unread count only (lightweight, used for polling) |
| PATCH | `/api/notifications/[notificationId]` | Session | Mark single notification as read |
| GET | `/api/unsubscribe` | None (signed token) | One-click unsubscribe (CAN-SPAM compliant) |

### `app/api/notifications/route.ts`

**GET** — List notifications
```
Auth: requireSession
Query: page=1, limit=30, workspaceId? (filter by workspace)
Returns: { notifications: Notification[], total: number, hasMore: boolean, unreadCount: number }
```

**PATCH** — Mark all as read
```
Auth: requireSession
Body: { workspaceId?: string }   -- optional: mark all read in one workspace only
Returns: { count: number }        -- number of notifications marked read
```

### `app/api/notifications/[notificationId]/route.ts`

**PATCH** — Mark single notification as read
```
Auth: requireSession
Validates: notification belongs to current user
Returns: updated notification
```

### `app/api/notifications/count/route.ts`

**GET** — Unread count only
```
Auth: requireSession
Returns: { unreadCount: number }
Cache-Control: no-store (always fresh — never served from Next.js cache)
```

### Validation Rules

| Field | Rules |
|---|---|
| Notification `type` | Must be one of the 7 valid type values |
| `notificationId` (mark read) | Must belong to current user |
| `workspaceId` (mark all read) | Optional — if provided, must be a workspace the user belongs to |

---

## Notification Events

Email events (see [`../JOBS.md`](../JOBS.md) for the canonical job list):

| Event | Recipient | Trigger | Handler |
|---|---|---|---|
| New post submitted | Workspace `owner` + `admin` members | Post approved | `send-new-post-alert.ts` |
| Post status changed | Post voters | Status changed | `send-status-change-email.ts` |
| New comment on post | Post author | Top-level comment approved | `send-new-comment-email.ts` |
| Reply to comment | Parent comment author | Reply approved | `send-comment-reply-email.ts` |
| Workspace invite | Invitee | Invite created | `send-workspace-invite-email.ts` |
| Member removed | Removed member | Member removed | `send-member-removed-email.ts` |
| Workspace deleted | All members | Workspace deleted | `send-workspace-deleted-email.ts` |
| Changelog published | Voters of linked posts | Entry published | `send-changelog-email.ts` |

In-app events (`notifications.type` values):

| Type | Recipient | Trigger | Link |
|---|---|---|---|
| `new_post` | Workspace `owner` + `admin` members | Post approved | Post detail page |
| `status_change` | Post voters (signed-in) | Status changed | Post detail page |
| `new_comment` | Post author (signed-in) | Top-level comment approved | Post detail page |
| `reply` | Parent comment author (signed-in) | Reply approved | Post detail page |
| `invite_accepted` | Workspace inviter | Invite accepted | Members settings |
| `member_removed` | Removed member | Member removed | Dashboard |
| `changelog_published` | Post voters (signed-in) | Entry published | Changelog entry page |

> In-app notifications are only created for signed-in users (`user_id` required). Not-signed-in voters and commenters receive emails only — no in-app row, since they have no account.

### Self-Notification Suppression

Applied at the **enqueue callsite** (in service functions), not in job handlers:

| Event | Suppression Rule |
|---|---|
| New post alert | The member who submitted the post is not alerted to their own post |
| Status change | The member who changed the status is not notified if they also voted |
| New comment | Post author who is also the commenter is suppressed |
| Comment reply | Parent commenter who is also the replier is suppressed |
| Invite accepted | N/A — inviter receives notification, not invitee |
| Member removed | Removed user receives email — no in-app (they can't access workspace) |

```ts
// In changeStatus() service — exclude the member who changed the status:
const votersExcludingSelf = voters.filter(v => v.userId !== changedBy)
for (const voter of votersExcludingSelf) {
  await enqueue(JobType.SEND_STATUS_CHANGE_EMAIL, { ...payload, voterUserId: voter.userId })
}

// In createPost() / approvePost() service — exclude the member who submitted/approved the post:
const adminsExcludingAuthor = workspaceAdmins.filter(a => a.userId !== post.authorId)
for (const admin of adminsExcludingAuthor) {
  await enqueue(JobType.SEND_NEW_POST_ALERT, { ...payload, adminUserId: admin.userId, adminEmail: admin.email })
}
```

---

## Email Delivery

Email sends are **always** routed through the durable `email_outbox` table and pg-boss — never via a synchronous SMTP call in an API route. Schema for `email_outbox`, `email_preferences`, and `notifications` lives in [`../DATABASE.md`](../DATABASE.md).

### Environment Variables

```env
# SMTP (all email notifications)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="IdeaRoads <noreply@yourdomain.com>"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="IdeaRoads"
```

### Dependencies

```
pg-boss                    — job queue for all email sends
nodemailer                 — SMTP email delivery
@react-email/components    — React components for email templates
@react-email/render        — Render React Email components → HTML string (server-side only)
sonner                     — toast for in-app errors
```

### `lib/email/index.ts` — Durable Email Outbox

```ts
enqueueEmail({ to, subject, html })
  → INSERT INTO email_outbox { to_email: to, subject, html_body: html, status: 'queued' }
  → await queue.send(JOB_NAMES.SEND_EMAIL, { outboxId: row.id })
  → returns void

  Pattern: DB row is written FIRST, then the job enqueued.
  If the app crashes between these two lines, the CLEANUP_EMAIL_OUTBOX cron (4am daily)
  finds rows stuck in 'queued' and re-enqueues them. Zero email loss.
```

All email handlers call `enqueueEmail()` — they NEVER call `transporter.sendMail()` directly.

```ts
// In send-status-change-email.ts
const html = await render(<StatusChangeEmail postTitle={post.title} newStatus={status} />)
await enqueueEmail({
  to: voter.email,
  subject: `Status update: "${post.title}"`,
  html,
})
await createNotification({ userId: voter.userId, ... })
```

### `lib/worker/handlers/send-email.ts`

```ts
// Processes a single email_outbox row
handler: async ({ data: { outboxId } }) => {
  // 1. Claim the row atomically
  const row = await db.transaction(async (tx) => {
    const [r] = await tx
      .update(emailOutbox)
      .set({ status: "sending", attempts: sql`attempts + 1`, updatedAt: new Date() })
      .where(and(eq(emailOutbox.id, outboxId), eq(emailOutbox.status, "queued")))
      .returning()
    return r
  })
  if (!row) return  // already being processed by another worker

  try {
    await transporter.sendMail({
      to: row.toEmail,
      subject: row.subject,
      html: row.htmlBody,
    })
    await db.update(emailOutbox)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(emailOutbox.id, outboxId))
  } catch (err) {
    await db.update(emailOutbox)
      .set({ status: "failed", lastError: err.message, updatedAt: new Date() })
      .where(eq(emailOutbox.id, outboxId))
    throw err  // let pg-boss retry
  }
}
```

### `lib/email/transporter.ts` — Nodemailer Singleton

```ts
import nodemailer from "nodemailer"

let _transporter: nodemailer.Transporter | null = null

export function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return _transporter
}

export async function sendEmail({ to, subject, html, text }: {
  to: string; subject: string; html: string; text: string
}) {
  const transporter = getTransporter()
  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html, text })
}
```

### `lib/email/renderer.ts`

```ts
import { render } from "@react-email/render"

export async function renderEmail(component: React.ReactElement): Promise<string> {
  return render(component)
  // Returns full HTML string with inline styles. Server-side only (Node.js environment).
}
```

### `lib/email/templates/layout.tsx`

Base layout shared by all email templates (header, footer, brand colors, unsubscribe link):

```tsx
export function EmailLayout({ children, preview }: { children: React.ReactNode; preview: string }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9f9f9" }}>
        <Container>
          <Section>
            <Text style={{ fontWeight: "bold" }}>{env.NEXT_PUBLIC_APP_NAME}</Text>
          </Section>
          {children}
          {/* Footer with unsubscribe link — required by CAN-SPAM / GDPR */}
          <Section>
            <Text style={{ fontSize: "12px", color: "#888" }}>
              You're receiving this because you voted on a post in {workspaceName}.{" "}
              <Link href={unsubscribeUrl}>Unsubscribe</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
```

**Styling:** Inline CSS only (email client compatibility). No external stylesheets. Each template returns `{ html: string, text: string }`; templates must render a plain-text fallback. Test with Mailtrap.

---

## Notification Creation & Queries

### `lib/notifications/create.ts`

```ts
createNotification({ userId, workspaceId, type, title, body?, link })
  → validates: userId and workspaceId are non-null (skip silently if null — not-signed-in action)
  → inserts notification row
  → returns notification

  Called from inside job handlers AFTER email is enqueued (if email send fails,
  in-app notification is still created). Idempotent on (userId, type, link).
```

### `lib/notifications/queries.ts`

```ts
getUnreadCount(userId)
  → SELECT COUNT(*) FROM notifications WHERE user_id = userId AND is_read = false → number

listNotifications(userId, { page = 1, limit = 30 })
  → SELECT * FROM notifications WHERE user_id = userId
    ORDER BY created_at DESC LIMIT limit OFFSET (page - 1) * limit
  → { notifications: Notification[], total, hasMore }

markAsRead(notificationId, userId)
  → UPDATE notifications SET is_read = true WHERE id = notificationId AND user_id = userId

markAllAsRead(userId, workspaceId?)
  → UPDATE notifications SET is_read = true
    WHERE user_id = userId AND is_read = false
    AND (workspaceId ? workspace_id = workspaceId : true)
  → { count: number }
```

---

## In-App Polling

The notification bell is a client component in the workspace navbar. It polls `GET /api/notifications/count` every 30 seconds while the tab is active, and pauses while the tab is hidden. There is no WebSocket/SSE in MVP.

### `components/notifications/notification-bell.tsx`

```ts
useEffect(() => {
  const fetchCount = async () => {
    if (document.visibilityState === 'hidden') return
    const res = await fetch('/api/notifications/count')
    const data = await res.json()
    setUnreadCount(data.unreadCount)
  }

  fetchCount()
  const interval = setInterval(fetchCount, 30_000)
  document.addEventListener('visibilitychange', fetchCount)

  return () => {
    clearInterval(interval)
    document.removeEventListener('visibilitychange', fetchCount)
  }
}, [])
```

- Badge shows unread count, capped at display "99+" when > 99.
- Clicking navigates to `/{ws-slug}/notifications` (full page, not a dropdown).
- Badge clears after visiting the notifications page (server-side `markAllAsRead` on load).

### `components/notifications/notification-item.tsx`

Clicking a row marks it read (`PATCH /api/notifications/[id]`), updates local state optimistically, then navigates to `notification.link`. Unread rows have a highlighted background + blue dot. Type icons:

| Type | Icon |
|---|---|
| `new_post` | FileText |
| `status_change` | ArrowRight |
| `new_comment` | MessageCircle |
| `reply` | CornerDownRight |
| `invite_accepted` | UserCheck |
| `member_removed` | UserX |
| `changelog_published` | Megaphone |

### `components/notifications/notification-list.tsx`

Groups by "Today" / "This Week" / "Earlier" (by `created_at`). Infinite scroll or "Load more" pagination (30 per page). "Mark all as read" → `PATCH /api/notifications`. Renders `<NotificationEmptyState />` when empty.

### `app/(workspace)/[ws-slug]/notifications/page.tsx`

Server component. Fetches the first page server-side, passes it to `<NotificationList />` as initial data, and calls `markAllAsRead(userId, workspaceId)` server-side on page load — so the bell badge clears without a client API call.

---

## Unsubscribe

### `GET /api/unsubscribe`

No login required. Link appears in the footer of every outgoing notification email.

**Query params:** `?email=<email>&type=<type>&token=<hmac>`

**Token generation (at email send time):**
```ts
const payload = `${email}:${type}`
const token = createHmac("sha256", env.APP_SECRET).update(payload).digest("hex")
const unsubscribeUrl = `${env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&type=${type}&token=${token}`
```

**Verification (at route handler):**
```ts
const expected = createHmac("sha256", env.APP_SECRET).update(`${email}:${type}`).digest("hex")
if (!timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
  return Response.json({ error: "Invalid token" }, { status: 400 })
}
// Upsert email_preferences row: set status_change = false OR changelog = false
await db.insert(emailPreferences)
  .values({ email, [type]: false })
  .onConflictDoUpdate({ target: emailPreferences.email, set: { [type]: false, updatedAt: new Date() } })
```

**Response:** Renders a plain confirmation page: "You have been unsubscribed from {type} emails."

**Opt-out check (before every outgoing notification email):**
```ts
const prefs = await db.query.emailPreferences.findFirst({ where: eq(emailPreferences.email, voterEmail) })
if (prefs && !prefs[notificationType]) return  // skip — user has opted out
```

`email_preferences` is keyed by email (not `user_id`), since not-signed-in voters have no account. A row is created on first unsubscribe; a missing row means all notifications are enabled (opt-out model). See [`../DATABASE.md`](../DATABASE.md).

---

## Background Jobs

The canonical job list, triggers, handlers, and queue policies live in [`../JOBS.md`](../JOBS.md). This section covers handler structure, payloads, and worker startup specific to notifications.

### Job Handler Structure

All email handlers follow the same pattern: create the in-app notification first (so it survives an SMTP failure), then send the email.

```ts
// Example: send-status-change-email.ts
export async function handleSendStatusChangeEmail(job: { data: StatusChangeEmailPayload }) {
  const { voterEmail, voterName, voterUserId, postTitle, postUrl,
          fromStatus, toStatus, note, workspaceName, workspaceId } = job.data

  // 1. Create in-app notification first (only if voter has an account)
  if (voterUserId) {
    await createNotification({
      userId: voterUserId,
      workspaceId,
      type: "status_change",
      title: `"${postTitle}" is now ${formatStatus(toStatus)}`,
      body: note ?? undefined,
      link: postUrl,
    })
  }

  // 2. Send email — pg-boss retries the handler on failure; createNotification is
  //    idempotent on (userId, type, link) so the in-app row is never duplicated
  await sendEmail({
    to: voterEmail,
    subject: `Update on "${postTitle}": now ${formatStatus(toStatus)}`,
    html: renderStatusChangeEmail({ ... }),
    text: `The post "${postTitle}" in ${workspaceName} is now ${toStatus}. View it at: ${postUrl}`,
  })
}
```

### Job Handler Payloads (Consolidated)

```ts
// SEND_NEW_POST_ALERT
{ postId, postTitle, postUrl, authorName, boardName, workspaceName, workspaceId,
  adminUserId /* one job per admin */, adminEmail }

// SEND_STATUS_CHANGE_EMAIL
{ voterEmail, voterName, voterUserId: string | null, postTitle, postUrl,
  fromStatus, toStatus, note: string | null, workspaceName, workspaceId }

// SEND_NEW_COMMENT_EMAIL
{ postAuthorEmail, postAuthorName, postAuthorUserId: string | null, postTitle,
  postUrl, commenterName, commentBody, workspaceName, workspaceId }

// SEND_COMMENT_REPLY_EMAIL
{ parentAuthorEmail, parentAuthorName, parentAuthorUserId: string | null, postTitle,
  postUrl, replierName, replyBody, workspaceName, workspaceId }

// SEND_WORKSPACE_INVITE_EMAIL
{ inviteId, email, workspaceName, workspaceId, inviterName, role, inviteUrl, expiresAt }

// SEND_MEMBER_REMOVED_EMAIL
{ removedUserEmail, removedUserName, removedUserId: string | null,
  workspaceName, workspaceId, removedByName }

// SEND_WORKSPACE_DELETED_EMAIL
{ memberEmail, memberName, workspaceName, ownerName }

// SEND_CHANGELOG_EMAIL
{ voterEmail, voterName, voterUserId: string | null, entryTitle, entryLabel,
  entryUrl, entryBodyPreview, linkedPostTitle, workspaceName, workspaceId }
```

### `lib/worker/queue.ts` — pg-boss Singleton

```ts
import PgBoss from "pg-boss"

let boss: PgBoss | null = null

export async function getQueue(): Promise<PgBoss> {
  if (!boss) {
    boss = new PgBoss({
      connectionString: process.env.DATABASE_URL,
      retryLimit: 3,
      retryDelay: 30,      // 30 seconds between retries
      expireInHours: 24,
    })
    await boss.start()
    await registerHandlers(boss)
  }
  return boss
}

export async function enqueue<T>(jobName: string, data: T, options?: PgBoss.SendOptions) {
  const queue = await getQueue()
  return queue.send(jobName, data, options)
}
```

### `lib/worker/job-types.ts`

```ts
export const JobType = {
  SEND_NEW_POST_ALERT:            "SEND_NEW_POST_ALERT",
  SEND_STATUS_CHANGE_EMAIL:       "SEND_STATUS_CHANGE_EMAIL",
  SEND_NEW_COMMENT_EMAIL:         "SEND_NEW_COMMENT_EMAIL",
  SEND_COMMENT_REPLY_EMAIL:       "SEND_COMMENT_REPLY_EMAIL",
  SEND_WORKSPACE_INVITE_EMAIL:    "SEND_WORKSPACE_INVITE_EMAIL",
  SEND_MEMBER_REMOVED_EMAIL:      "SEND_MEMBER_REMOVED_EMAIL",
  SEND_WORKSPACE_DELETED_EMAIL:   "SEND_WORKSPACE_DELETED_EMAIL",
  SEND_CHANGELOG_EMAIL:           "SEND_CHANGELOG_EMAIL",
  CLEANUP_EXPIRED_INVITES:        "CLEANUP_EXPIRED_INVITES",
  CLEANUP_READ_NOTIFICATIONS:     "CLEANUP_READ_NOTIFICATIONS",
  CLEANUP_WEBHOOK_DELIVERIES:     "CLEANUP_WEBHOOK_DELIVERIES",
} as const

export type JobType = typeof JobType[keyof typeof JobType]
```

### `lib/worker/scheduler.ts` — Cron Jobs

```ts
import { getQueue } from "./queue"

export async function registerCronJobs() {
  const boss = await getQueue()
  await boss.schedule(JobType.CLEANUP_EXPIRED_INVITES,    "0 2 * * *", {}, { tz: "UTC" })
  await boss.schedule(JobType.CLEANUP_READ_NOTIFICATIONS, "0 3 * * *", {}, { tz: "UTC" })
  await boss.schedule(JobType.CLEANUP_WEBHOOK_DELIVERIES, "0 4 * * *", {}, { tz: "UTC" })
}
```

### Worker Startup

```ts
// lib/worker/startup.ts
export async function startWorker() {
  const boss = await getQueue()

  await boss.work(JobType.SEND_NEW_POST_ALERT, handleSendNewPostAlert)
  await boss.work(JobType.SEND_STATUS_CHANGE_EMAIL, handleSendStatusChangeEmail)
  await boss.work(JobType.SEND_NEW_COMMENT_EMAIL, handleSendNewCommentEmail)
  await boss.work(JobType.SEND_COMMENT_REPLY_EMAIL, handleSendCommentReplyEmail)
  await boss.work(JobType.SEND_WORKSPACE_INVITE_EMAIL, handleSendWorkspaceInviteEmail)
  await boss.work(JobType.SEND_MEMBER_REMOVED_EMAIL, handleSendMemberRemovedEmail)
  await boss.work(JobType.SEND_WORKSPACE_DELETED_EMAIL, handleSendWorkspaceDeletedEmail)
  await boss.work(JobType.SEND_CHANGELOG_EMAIL, handleSendChangelogEmail)
  await boss.work(JobType.CLEANUP_EXPIRED_INVITES, handleCleanupExpiredInvites)
  await boss.work(JobType.CLEANUP_READ_NOTIFICATIONS, handleCleanupReadNotifications)
  await boss.work(JobType.CLEANUP_WEBHOOK_DELIVERIES, handleCleanupWebhookDeliveries)

  await registerCronJobs()
}
```

**Called from** `app/layout.tsx` (root server component) using a module-level singleton guard:
```ts
import { startWorker } from "@/lib/worker/startup"
if (process.env.NODE_ENV !== "test") {
  startWorker().catch(console.error)
}
```

---

## File Structure

```
app/
├── (workspace)/[ws-slug]/notifications/page.tsx   Full notifications list page
└── api/notifications/
    ├── route.ts                    GET list / PATCH mark-all-read
    ├── count/route.ts              GET unread count (polling)
    └── [notificationId]/route.ts   PATCH mark-as-read

components/notifications/
├── notification-bell.tsx           Navbar bell icon with unread badge
├── notification-item.tsx           Single notification row
├── notification-list.tsx           Full scrollable list
└── notification-empty-state.tsx    Empty state illustration

lib/
├── notifications/{queries.ts, create.ts, index.ts}
├── email/
│   ├── index.ts                    enqueueEmail() — insert email_outbox row + enqueue SEND_EMAIL
│   ├── transporter.ts              Nodemailer transporter singleton
│   ├── renderer.ts                 render(ReactEmailComponent) → HTML string (server-side only)
│   └── templates/                  React Email components (layout + one per event)
└── worker/
    ├── queue.ts                    pg-boss instance (singleton)
    ├── scheduler.ts                Cron job registration
    ├── job-types.ts                Job type constants
    ├── startup.ts                  Handler registration
    └── handlers/                   send-email.ts, send-*-email.ts, cleanup-*.ts

db/schema/email-outbox.ts           email_outbox table definition
```

---

## Technical Notes

- pg-boss uses the **same PostgreSQL database** as the application — no separate Redis or queue service. pg-boss creates its own `pgboss` schema with job tables.
- `startWorker()` uses a module-level singleton guard (`if (!boss)`) — safe to call across Next.js hot reloads in development without registering duplicate handlers.
- In-app notification creation happens **inside the job handler before the email send** — this guarantees the in-app record is committed even if SMTP throws. pg-boss retries the handler (re-running `sendEmail`), but `createNotification` is idempotent on `(userId, type, link)`, so the notification is never duplicated.
- `GET /api/notifications/count` has `Cache-Control: no-store` — always a fresh count, never served from Next.js cache.
- Notification polling uses `setInterval` with a `visibilitychange` cleanup — uses `useEffect` + `useRef` for stable interval management across re-renders.
- `markAllAsRead()` runs **server-side** on the notifications page load — the bell badge clears without a client-side API call, giving immediate feedback.
- The `notifications` table grows unboundedly in MVP. `CLEANUP_READ_NOTIFICATIONS` (3am daily) deletes read notifications older than 90 days.

### Edge Cases

| Case | Handling |
|---|---|
| Job handler throws (SMTP down) | In-app notification is committed before `sendEmail`. pg-boss retries the send up to 3 times (30s delay). After max retries: job failed, email undelivered, in-app notification still persisted. |
| Email bounce / invalid address | SMTP returns error → pg-boss retries. After retries exhausted: failure logged, not re-attempted. No impact on in-app notification. |
| In-app notification for deleted user | `user_id` FK with CASCADE DELETE — notification deleted when user deleted. |
| Workspace deleted with unread notifications | `workspace_id` FK with CASCADE DELETE — all workspace notifications deleted. |
| 1000 voters on a post, status changes | 1000 jobs enqueued. Processed with default concurrency (~5 at a time), ~200s at 5 emails/s. Acceptable for MVP. |
| Voter deletes account | `votes.user_id` SET NULL; future status change has `user_id = null` → email only (no in-app). |
| Member and voter are the same person | Self-notification suppression at enqueue callsite. |
| Polling while tab hidden | `visibilitychange` listener pauses polling when hidden, resumes on focus. |
| Notification for a workspace just left | Membership removal CASCADE-deletes that workspace's notifications; bell count updates on next poll. |
| Two events within 1 second | Two separate notifications — no deduplication in MVP. |
| Bell badge exceeds 99 | Display "99+"; actual count stored correctly in DB. |
| pg-boss not started (cold start) | `startWorker()` runs on first request; jobs queue in pg-boss tables and process on first incoming request. |
