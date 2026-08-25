# Implementation — Feature 08: Categories & Status

> Implementation reference for Feature 08 — Categories & Status. Product behaviour: ../../features/08-categories-and-status.md

This document holds the technical detail removed from the product spec. Schema is owned by [`../DATABASE.md`](../DATABASE.md) — referenced here, not duplicated.

> **Implemented (Phase 5 — status integrity).** `updatePostStatusAction` validates the target status against the workspace's defined statuses (`getWorkspaceStatusBySlug`) — arbitrary free-text statuses are rejected. Status **slugs are immutable** (`updateWorkspaceStatus` only changes name/color/order), so the roadmap's slug-based mapping (`planned`/`in_progress`/`completed`) is robust to renames — renaming a status changes only its display name. Every status change is now appended to `post_status_changes` (see [Feature 05 impl](05-feedback-posts.md)).

> **Implemented (Phase 3 — triage vs structure).** Applying the taxonomy to a post is now a **member-level** action: assigning a category (`updatePostCategoryAction`) and changing a post's status (`updatePostStatusAction`) require only workspace membership (Brand Admin or Team Member), per PLATFORM.md §4. **Defining** the taxonomy — creating/editing/deleting categories and statuses (`createCategoryAction`, `updateCategoryAction`, `deleteCategoryAction`, `reorderCategoriesAction`, and the status CRUD actions) — **remains Brand-Admin-only**, and the `/{slug}/settings/categories` and `/{slug}/settings/statuses` pages now return not-found for Team Members.

---

## Dependencies

```
@paralleldrive/cuid2    — category IDs and status-change IDs
slugify                 — generate category slug from name
pg-boss                 — enqueue SEND_STATUS_CHANGE_EMAIL job
nodemailer              — deliver status change emails
```

No new environment variables beyond Feature 01.

---

## Database

Tables for this feature — `categories` and `post_status_changes` — plus the activated `posts.status` and `posts.category_id` columns are defined in [`../DATABASE.md`](../DATABASE.md). Key points relevant to behaviour:

- `categories`: `id` (cuid2 PK), `workspace_id` → `workspaces.id` (CASCADE DELETE), `name`, `slug`, `color` (hex string, default `#6366f1`), `created_at`, `updated_at`.
  - Constraints: `UNIQUE (workspace_id, slug)` and `UNIQUE (workspace_id, name)`.
  - Index on `workspace_id`.
- `post_status_changes` (activated from the Feature 05 stub): `id` (cuid2 PK), `post_id` → `posts.id` (CASCADE DELETE), `from_status`, `to_status`, `changed_by` → `user.id`, `note` (optional), `created_at`.
  - Indexes on `post_id` and `(post_id, created_at DESC)` (status history list).
  - Append-only — never updated or deleted; permanent audit trail.
- `posts.status`: `text NOT NULL DEFAULT 'open'`, one of `open | under_review | planned | in_progress | completed | closed` (modelled as the `PostStatus` pgEnum).
- `posts.category_id`: nullable, → `categories.id` with `SET NULL` on delete (no cascade delete of posts).

---

## Status Workflow

Six statuses modelled as the `PostStatus` value set:

| Status | Slug | Badge Colour | Roadmap Column |
|---|---|---|---|
| Open | `open` | Grey | — |
| Under Review | `under_review` | Yellow/Amber | — |
| Planned | `planned` | Blue | Planned |
| In Progress | `in_progress` | Purple/Indigo | In Progress |
| Completed | `completed` | Green | Completed |
| Closed | `closed` | Red | — |

Roadmap column mapping (consumed by Feature 09): `planned` → Planned, `in_progress` → In Progress, `completed` → Completed. `open`, `under_review`, `closed` do not appear on the public roadmap.

---

## Service Layer

### `lib/categories/queries.ts`

```ts
getCategoriesForWorkspace(workspaceId)
  → returns categories[] ordered by name ASC
  → includes post_count per category (subquery)

getCategoryById(categoryId, workspaceId)
  → returns single category or null (with workspace ownership check)

getCategoryBySlug(slug, workspaceId)
  → returns category or null
```

### `lib/categories/create.ts`

```ts
createCategory(workspaceId, { name, color? })
  → validates: name 1–50 chars
  → validates: name unique within workspace
  → generates slug from name (slugify)
  → validates: slug unique within workspace (on collision append -1, -2, …)
  → validates: color is valid hex string (default '#6366f1' if omitted)
  → inserts category row
  → returns category
```

### `lib/categories/update.ts`

```ts
updateCategory(categoryId, workspaceId, { name?, color? })
  → if name changes: validate uniqueness within workspace, regenerate slug
  → if color changes: validate hex format
  → updates row + updated_at
  → returns updated category
```

### `lib/categories/delete.ts`

```ts
deleteCategory(categoryId, workspaceId)
  → verifies category belongs to workspace
  → in db.transaction():
      → UPDATE posts SET category_id = NULL WHERE category_id = categoryId
      → DELETE FROM categories WHERE id = categoryId
  → returns void
```

`lib/categories/index.ts` re-exports the above.

### Status Change Service — `changeStatus` (in `lib/posts/update.ts`, extended from Feature 05)

```ts
changeStatus(postId, workspaceId, newStatus, changedBy, note?)
  → fetch current post
  → if post not found: throw NotFoundError
  → if newStatus === post.status: return post (no-op — no log, no email)
  → validate newStatus is a valid PostStatus value

  In db.transaction():
    → INSERT INTO post_status_changes {
        id, post_id,
        from_status: post.status,
        to_status: newStatus,
        changed_by: changedBy,
        note: note ?? null,
        created_at: now()
      }
    → UPDATE posts SET status = newStatus, updated_at = now() WHERE id = postId

  Post-transaction:
    → fetch all voters for this post (votes table — user_id + user_email)
    → for each voter with a valid email:
        enqueue SEND_STATUS_CHANGE_EMAIL job
    → returns updated post
```

The function was stubbed in Feature 05; this feature adds the `post_status_changes` insert and the email-job enqueue step.

---

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/workspaces/[slug]/categories` | `requireWorkspaceMember` | List workspace categories (id, name, slug, color, postCount) ordered by name ASC |
| POST | `/api/workspaces/[slug]/categories` | `requireRole(['owner','admin'])` | Create category — 201 + category |
| PATCH | `/api/workspaces/[slug]/categories/[categoryId]` | `requireRole(['owner','admin'])` | Update category |
| DELETE | `/api/workspaces/[slug]/categories/[categoryId]` | `requireRole(['owner','admin'])` | Nullify `category_id` on posts, then delete — 204 |
| PATCH | `/api/posts/[postId]/status` | `requireRole(['owner','admin'])` | Change post status — `{ post, statusChange }` |

> The `owner` / `admin` stored role values both map to the **Brand Admin** product role (see [`../DATABASE.md`](../DATABASE.md)).

**POST / PATCH category body:** `{ name: string, color?: string }`. Validates `name` required 1–50 chars and unique within workspace; `color` optional, must match `/^#[0-9A-Fa-f]{6}$/` if provided, defaults to `#6366f1`.

**PATCH status body:** `{ status: PostStatus, note?: string }`. Validates `status` is one of the six values; `note` optional, max 500 chars. Calls `changeStatus(postId, workspaceId, status, session.user.id, note)`.

**Category assignment** uses the Feature 05 post-update endpoint: PATCH `/api/posts/[postId]` `{ categoryId }`.

---

## File Structure

```
app/
├── (workspace)/
│   └── [ws-slug]/
│       └── settings/
│           └── categories/
│               └── page.tsx                Manage categories page (server component)
└── api/
    ├── workspaces/
    │   └── [slug]/
    │       └── categories/
    │           ├── route.ts                GET list / POST create
    │           └── [categoryId]/
    │               └── route.ts            PATCH update / DELETE
    └── posts/
        └── [postId]/
            └── status/
                └── route.ts                PATCH change status (activated from Feature 05)

components/
├── categories/
│   ├── category-chip.tsx                   Coloured label chip shown on post cards
│   ├── category-select.tsx                 Dropdown to assign category to a post
│   ├── category-form.tsx                   Create / edit category form (name, colour)
│   └── category-list.tsx                   Manage categories table (settings page)
├── posts/
│   ├── status-badge.tsx                    Activated fully (colours wired up)
│   ├── status-select.tsx                   Admin dropdown to change post status
│   └── status-history.tsx                  Accordion of past status changes on post detail
└── boards/
    └── board-controls.tsx                  Updated: adds category filter + status filter

lib/
├── categories/
│   ├── queries.ts
│   ├── create.ts
│   ├── update.ts
│   ├── delete.ts
│   └── index.ts
└── worker/handlers/
    └── send-status-change-email.ts

lib/email/templates/
└── status-change.ts
```

### Component notes

- **`category-chip.tsx`** — pill with `● {name}`; dot colour = `category.color`, background = colour at 15% opacity, text = darkened colour for contrast. Background tint and text contrast derived at render time via CSS `opacity` or a colour-manipulation utility. Clickable to apply a filter on the board page; display-only on post detail.
- **`category-select.tsx`** — client dropdown used in `<SubmitPostModal />` (Feature 05, optional on submit) and `<AdminPostToolbar />` (Feature 05, change existing). Lists workspace categories with colour dots plus a "No category" option; PATCH `/api/posts/[postId]` `{ categoryId }`; optimistic update reverts on error.
- **`category-form.tsx`** — Dialog for create/edit. Fields: name (1–50 chars, live uniqueness hint) and colour (12-preset palette + custom hex). Presets: `#6366f1` Indigo, `#8b5cf6` Violet, `#ec4899` Pink, `#f43f5e` Rose, `#f97316` Orange, `#eab308` Yellow, `#84cc16` Lime, `#22c55e` Green, `#14b8a6` Teal, `#06b6d4` Cyan, `#3b82f6` Blue, `#64748b` Slate. Create → POST; edit → PATCH; name-uniqueness error inline.
- **`category-list.tsx`** — settings table. Columns: colour swatch, name, slug, posts-using, actions. Delete uses an AlertDialog that surfaces the post count (`> 0` warns the label will be removed from `{n}` posts).
- **`status-select.tsx`** — dropdown in `<AdminPostToolbar />` with all six colour-coded options; optional note textarea before confirm stored in `post_status_changes.note`; optimistic badge update reverts with a toast on error.
- **`status-history.tsx`** — collapsible timeline on post detail (newest first, with from→to, relative time, actor name, optional note). Visible to workspace members only; hidden from public post detail.
- **`board-controls.tsx`** — adds a category filter dropdown alongside sort + status. `categoryId=xxx` added to URL query params; status + category filters are additive (AND logic) in `listPosts()`. Category dropdown hidden when the workspace has no categories.

The categories GET endpoint is consumed by `<SubmitPostModal />`, `<BoardControls />`, and `<AdminPostToolbar />` — fetch and cache at the workspace layout level where possible to avoid redundant calls.

---

## Background Jobs

### `SEND_STATUS_CHANGE_EMAIL`

**Trigger:** `changeStatus()` — one job enqueued per voter email after a status change.

**Payload:**
```ts
{
  voterEmail: string
  voterName: string
  postTitle: string
  postUrl: string
  fromStatus: string
  toStatus: string
  note: string | null
  workspaceName: string
  adminNote?: string
}
```

**Handler:** `lib/worker/handlers/send-status-change-email.ts`
- Sends one email per voter.
- Subject: `"Update on '{postTitle}': now {toStatus}"`.
- Body: post title + link; status change `{fromStatus} → {toStatus}`; admin note (if present); "You're receiving this because you voted on this post."; one-click HMAC-signed unsubscribe link, no login required (see Feature 11 — Unsubscribe).

**Volume / reliability:** enqueued one job per voter (not one for all) so pg-boss can apply controlled concurrency and retry individual failures without re-sending to everyone. A 500-voter post enqueues 500 jobs; processed with a concurrency limit to respect SMTP rate limits. Failed jobs retry up to 3 times, then are logged as failed without blocking the status change. See [`../JOBS.md`](../JOBS.md).

---

## Technical Notes

- `post_status_changes` is append-only — never updated or deleted; a permanent audit trail.
- Category colours are stored as hex strings; the UI derives background tint and text contrast at render time.
- `changeStatus` lives in `lib/posts/update.ts` (Feature 05); this feature only adds the email-job enqueue and the `post_status_changes` insert.
- Category slug is auto-generated from the name and **regenerated** when the name changes (unlike workspace/board slugs, which are user-controlled). Slug collisions append `-1`, `-2`, … as with workspace/board slugs.
- Concurrency: two simultaneous status changes are last-write-wins — both insert a `post_status_changes` row and both update `posts.status`; final state is the last applied status. No locking (status changes are not financially critical).
- Combined category + status filtering is applied as AND conditions in the `listPosts()` query.
- A `completed` status does **not** auto-create a changelog entry; changelog entries are authored manually (Feature 10).
