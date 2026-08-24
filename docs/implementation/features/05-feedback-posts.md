# Implementation — Feature 05: Feedback Posts

> Implementation reference for Feature 05 — Feedback Posts. Product behaviour: ../../features/05-feedback-posts.md

This document holds the technical detail removed from the product spec. Schema is owned by [`../DATABASE.md`](../DATABASE.md) — referenced here, not duplicated.

> **Implemented (Phase 2 — public portal).** The board list and post-detail pages now live in the **public** route group at `app/(public)/[slug]/b/[boardSlug]/page.tsx` and `.../p/[postSlug]/page.tsx` (relocated from `(workspace)`), so they are reachable **without an account**:
> - Session is optional (`getCurrentSession`); workspace membership is looked up only when signed in. Admin affordances (status select, pin, delete, voter list) render only for members whose role is not `member` — the *authorization* of those actions is unchanged (still enforced server-side; Team Member empowerment is Phase 3).
> - **Visibility:** private or archived boards, and unapproved (pending) posts, return `notFound()` for non-members. Public boards and approved posts are readable by anyone.
> - **Vote/comment** reuse the Phase 1 sign-in-required components (`isSignedIn` is derived from the optional session).
> - **Submission (M2):** `createPostAction` now allows **any signed-in User** to submit on a public, non-archived board — it checks board visibility instead of requiring workspace membership. Private/archived boards remain member-only. The `/{slug}/b/{board}/new` page redirects anonymous visitors to `/login?next=…`.
> - Pages render under the shared `components/workspace/portal-header.tsx` (the public chrome) instead of the workspace sidebar.

> **Implemented (Phase 3 — Team Member triage).** Feedback-handling actions are now available to **any workspace member** (Brand Admin and Team Member), per PLATFORM.md §4 — the role-restriction was removed from these server actions in `app/actions/posts.ts`:
> - `updatePostStatusAction`, `pinPostAction`, `updatePostCategoryAction` (and the duplicate in `app/actions/categories.ts`) now require only workspace membership, not `role !== member`.
> - `deletePostAction` allows any workspace member to remove feedback (clean-up) and the author to remove their own (the author check also covers a non-member customer deleting their own post).
> - `approvePostAction` (moderation queue) **remains Brand-Admin-only** — approving pending feedback is a moderation function, not triage.
> - Post-detail UI: status select, pin, delete, and the voter list now render for any member; the comment **moderation queue / unapproved visibility** (`canModerate`) stays Brand-Admin-only.

> **Implemented (Phase 5 — feedback operations completeness).**
> - **Move** (`movePostAction` → `lib/posts/move.ts`): changes a post's board (same workspace, different board); the slug is preserved unless it collides in the destination, then a fresh slug is generated. Available to any workspace member.
> - **Merge** (`mergePostAction` → `lib/posts/merge.ts`): transfers the source's votes onto the target (de-duplicating voters who already voted on the target), recomputes both vote counts, and sets `posts.merged_into_id` + `is_locked` on the source. Comments stay on the source, which remains viewable with a "Merged into …" notice. `searchMergeTargetsAction` backs the target picker. Merged posts are excluded from board lists and the roadmap (`isNull(merged_into_id)`); voting is blocked by the existing `is_locked` pre-flight.
> - **Merge summary comment**: `mergePost` also inserts one comment on the target — "Merged Feedback: '{source title}'" plus the source's body if it has one — attributed to the source's original author, always pre-approved (system-generated, not user input), and tagged via `comments.merged_from_post_id = sourceId`. `unmergePost` deletes that one comment (matched by `merged_from_post_id`) and decrements the target's `comment_count` back down.
> - **Status history** (M3): new `post_status_changes` table; `updatePostStatusAction` records each transition (from/to + actor) via `recordStatusChange`, and the post-detail page renders a `listStatusHistory` timeline (actor name shown to members only).
> - **Status validation** (L4): `updatePostStatusAction` now rejects a status that isn't one of the workspace's defined statuses (`getWorkspaceStatusBySlug`).
> - **Schema:** `post_status_changes` and `posts.merged_into_id` were added to the Drizzle schema. The repo's migration snapshot is stale (recent tables were applied via `pnpm db:push`), so these are applied the same way — **run `pnpm db:push`** rather than generating a migration (a generated migration produces a spurious full-schema diff).
> - UI components: `_components/move-post-button.tsx` (board dropdown) and `_components/merge-post-button.tsx` (search + confirm).

---

## Dependencies

```
@paralleldrive/cuid2    — post IDs
slugify                 — generate post slug from title
pg-boss                 — enqueue SEND_NEW_POST_ALERT job
nodemailer              — deliver alert email
```

No new environment variables beyond Feature 01.

---

## Database

Tables for this feature — `posts`, `post_status_changes`, and the (stubbed, non-functional) `post_attachments` — are defined in [`../DATABASE.md`](../DATABASE.md). Key points relevant to behaviour:

- `posts.status` defaults to `open` and is one of `open | under_review | planned | in_progress | completed | closed`.
- `posts.is_approved` is `true` when `moderation_mode = 'off'` or after manual approval.
- `posts.author_id` uses `SET NULL` on user deletion; `author_email` / `author_name` retain attribution for not-signed-in authors and for posts from deleted users.
- `posts.vote_count` and `posts.comment_count` are denormalised counters updated incrementally for fast reads; use `GREATEST(count - 1, 0)` on decrement to prevent negatives. Periodic reconciliation can be added post-MVP.
- `posts.merged_into_id` references the target post; merged posts are excluded from active lists (`merged_into_id IS NULL`).
- `post_status_changes` is append-only (audit trail) — never updated or deleted.
- `post_attachments` exists in the migration for future S3/R2 upload support; no upload endpoint is built in MVP. The `PostDetail` component carries an `attachments` prop typed `Attachment[]` defaulting to `[]`.

**Indexes** (see DATABASE.md for the authoritative list): `(board_id, status)`, `(board_id, vote_count DESC)`, `(board_id, created_at DESC)`, `(board_id, is_pinned)`, `workspace_id`, `author_id`, `merged_into_id`.

---

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/boards/[boardId]/posts` | Public / Member | List posts with sort + filters |
| POST | `/api/boards/[boardId]/posts` | Optional session | Submit a post |
| GET | `/api/posts/[postId]` | Public / Member | Get post detail |
| PATCH | `/api/posts/[postId]` | Author / team | Update title, description, category |
| DELETE | `/api/posts/[postId]` | Author (0 votes) / team | Delete post |
| PATCH | `/api/posts/[postId]/pin` | Team | Toggle pin |
| PATCH | `/api/posts/[postId]/status` | Team | Change status |
| PATCH | `/api/posts/[postId]/move` | Team | Move to another board |
| POST | `/api/posts/[postId]/merge` | Team | Merge into another post |
| PATCH | `/api/posts/[postId]/approve` | Team | Approve pending post |

> "Team" = Brand Admin and permitted Team Members. Internally enforced via the workspace-member/permission guard (legacy `requireRole(['owner','admin'])` checks map to this; `owner`/`admin` are stored values that mean Brand Admin, `member` means Team Member — see [`../DATABASE.md`](../DATABASE.md)).

### `GET /api/boards/[boardId]/posts`

```
Auth: Public (public boards) or requireWorkspaceMember (private boards)
Query params:
  sort=trending|newest|top    (default: trending)
  status=open|planned|...     (optional filter)
  categoryId=xxx              (optional filter)
  search=xxx                  (optional full-text search on title)
  page=1                      (pagination)
  limit=20                    (default 20, max 50)
Returns: { posts: Post[], total: number, hasMore: boolean }
  - Unapproved posts excluded for non-team requests
  - Merged posts excluded
  - hasVoted field included if the requester is authenticated
```

### `POST /api/boards/[boardId]/posts`

```
Auth: Session optional (not-signed-in authors allowed with email + name)
Body: { title, description?, categoryId?, authorEmail?, authorName? }
Validates:
  - If not signed in: authorEmail and authorName required
  - title: 5–150 chars
  - description: max 5000 chars
  - Board not archived
  - Valid email format if authorEmail provided
Calls: createPost(...)
Returns: 201 + post
Note: if moderation_mode = 'manual', returns 201 with is_approved = false
      and the client shows "Your post is pending review"
```

### `GET /api/posts/[postId]`

```
Auth: Public (if board is public) or requireWorkspaceMember
Returns: full post + author info + status_changes history
```

### `PATCH /api/posts/[postId]`

```
Auth: Session required
  - Author can edit own post (title, description) if not locked/merged
  - Team can edit any field including categoryId
Body: { title?, description?, categoryId? }
Returns: updated post
```

### `DELETE /api/posts/[postId]`

```
Auth: Session required
  - Author can delete own post only if vote_count = 0
  - Team can delete any post
Returns: 204
```

### `PATCH /api/posts/[postId]/pin`

```
Auth: team
Returns: updated post { is_pinned }
```

### `PATCH /api/posts/[postId]/status`

```
Auth: team
Body: { status: PostStatus, note?: string }
Validates: status is a valid PostStatus value
Calls: changeStatus(...)
Returns: updated post + new status_change record
```

### `PATCH /api/posts/[postId]/move`

```
Auth: team
Body: { boardId: string }
Validates: target board belongs to same workspace
Updates: post.board_id = boardId
Returns: updated post (new URL: /{ws-slug}/b/{new-board-slug}/p/{postId}-{slug})
```

### `POST /api/posts/[postId]/merge`

```
Auth: team
Body: { targetPostId: string }
Validates:
  - Target post belongs to same workspace
  - Source !== target
  - Neither is already merged
Calls: mergePosts(...)
Returns: { source, target }
```

### `PATCH /api/posts/[postId]/approve`

```
Auth: team
Updates: post.is_approved = true
Enqueues: SEND_NEW_POST_ALERT
Returns: updated post
```

### API edge-case responses

| Case | Response |
|---|---|
| Post submitted to archived board | 422 — "This board is no longer accepting submissions" |
| Merge a post that is already merged | 409 — "This post has already been merged" |
| Author tries to delete a post with votes (direct call) | 403 |
| Board deleted while post detail open | Next call returns 404 |

---

## Service Layer

Located under `lib/posts/` (`queries.ts`, `create.ts`, `update.ts`, `delete.ts`, `merge.ts`, `index.ts`).

### `lib/posts/queries.ts`

```ts
listPosts(boardId, {
  sort: 'trending' | 'newest' | 'top',
  status?: PostStatus,
  categoryId?: string,
  search?: string,
  page: number,
  limit: number,
  userId?: string,         // to include hasVoted flag
  includeUnapproved?: boolean,  // team only
})
  → returns paginated posts[]
  → pinned posts always first (ORDER BY is_pinned DESC, then sort)
  → merged posts excluded (merged_into_id IS NULL)
  → unapproved posts excluded unless includeUnapproved = true
  → includes hasVoted boolean if userId provided

getPostById(postId)
  → returns full post with author info or null

getPostByIdAndSlug(postId)
  → used for URL resolution (postId extracted from the "{id}-{slug}" param)

getTrendingScore(post)
  → see Trending Algorithm below; computed in SQL or application layer
```

### `lib/posts/create.ts`

```ts
createPost(boardId, workspaceId, {
  title,
  description?,
  authorId?,        // null for not-signed-in authors
  authorEmail?,     // for not-signed-in authors
  authorName?,      // for not-signed-in authors
  categoryId?,
})
  → validates: board exists, not archived
  → validates: title 5–150 chars
  → validates: description max 5000 chars
  → generates cuid2 id
  → generates slug from title (slugify)
  → checks workspace moderation_mode:
      'off'    → is_approved = true
      'auto'   → run spam keyword check → is_approved = true/false
      'manual' → is_approved = false (pending team review)
  → spam keyword check (moderation_mode = 'auto'):
      if title/description contains any workspace spam_keywords → is_approved = false
  → inserts post row
  → if is_approved: enqueues SEND_NEW_POST_ALERT
  → returns post
```

### `lib/posts/update.ts`

```ts
updatePost(postId, workspaceId, {
  title?, description?, categoryId?,
}, requesterId, requesterRole)
  → verifies post belongs to workspace
  → if requester is not a team member (Brand Admin / Team Member): verify requesterId = post.author_id
  → if post.is_locked or post.merged_into_id IS NOT NULL: reject (locked/merged posts cannot be edited)
  → updates fields + updated_at
  → returns updated post

togglePin(postId, workspaceId)
  → flips is_pinned
  → returns updated post

changeStatus(postId, workspaceId, newStatus, changedBy, note?)
  → fetches current post
  → if status unchanged: return (no-op)
  → inserts post_status_changes row
  → updates posts.status
  → enqueues SEND_STATUS_CHANGE_EMAIL (Feature 11)
  → returns updated post
```

### `lib/posts/merge.ts`

```ts
mergePosts(sourcePostId, targetPostId, workspaceId, mergedBy)
  → verifies both posts belong to workspace
  → verifies source !== target
  → verifies neither post is already merged
  → in db.transaction():
      → transfers all votes from source to target:
          UPDATE votes SET post_id = targetPostId WHERE post_id = sourcePostId
          (skip if voter already voted on target — de-duplicate)
      → updates target post vote_count = actual vote count
      → sets source post: merged_into_id = targetPostId, is_locked = true, status = 'closed'
      → inserts post_status_changes: open → closed (reason: merged)
  → returns { source: updatedSource, target: updatedTarget }
```

### `lib/posts/delete.ts`

```ts
deletePost(postId, workspaceId, requesterId, requesterRole)
  → verifies post belongs to workspace
  → if requester is not a team member (Brand Admin / Team Member):
      verify requesterId = post.author_id
      verify post.vote_count = 0 (authors can only delete their own posts with no votes)
  → hard deletes post row (CASCADE removes votes, comments, status_changes, attachments)
  → returns void
```

---

## Moderation Logic

```
workspace.moderation_mode = 'off'
  → post.is_approved = true immediately → public instantly

workspace.moderation_mode = 'auto'
  → check post title/description against workspace.spam_keywords[]
  → if clean: is_approved = true, public instantly
  → if flagged: is_approved = false, pending review queue

workspace.moderation_mode = 'manual'
  → post.is_approved = false always
  → team sees a "Pending Approval" section in the board view
  → team clicks Approve → PATCH /approve
  → is_approved = true, SEND_NEW_POST_ALERT enqueued
```

Notes:
- Spam keyword filtering applies only on creation; existing posts are not retroactively flagged when a keyword is added.
- Two simultaneous status changes: last write wins — no locking needed (idempotent in effect).
- Status changed to the same value: service detects no change → no `post_status_changes` row, no email.

---

## Trending Algorithm

```
score = vote_count / (hours_since_posted + 2) ^ 1.5
```

- Posts with recent votes score higher than old posts with the same vote count.
- Computed in SQL using `EXTRACT(EPOCH FROM (now() - created_at)) / 3600` for hours.
- Computed in the `ORDER BY` clause — no materialised view needed at MVP scale.
- Pinned posts bypass this sort and are always shown first.

---

## Post URL Resolution

Post URL format: `/{ws-slug}/b/{board-slug}/p/{postId}-{readable-slug}`

Example: `/acme/b/feature-requests/p/clx1234abcd-dark-mode-support`

```ts
// params.postId = "clx1234abcd-dark-mode-support"
const id = params.postId.split('-')[0]   // "clx1234abcd" (cuid2 has no hyphens)
const post = await getPostById(id)
if (!post) notFound()

// Canonical check: ensure board slug matches the post's current board
if (post.board.slug !== params['board-slug']) {
  redirect(`/${params['ws-slug']}/b/${post.board.slug}/p/${params.postId}`)
}
```

The `postId` segment is `{cuid2}-{readable-slug}`; extract the id by splitting on `-` and taking the first segment (cuid2 never contains hyphens).

---

## Components

```
app/
├── (workspace)/[ws-slug]/b/[board-slug]/page.tsx     Team board post list
├── (public)/[ws-slug]/b/[board-slug]/
│   ├── page.tsx                                       Public board post list
│   └── p/[postId]/page.tsx                            Post detail page
└── api/
    ├── boards/[boardId]/posts/route.ts                GET list / POST create
    └── posts/[postId]/
        ├── route.ts                                   GET / PATCH / DELETE
        ├── pin/route.ts                               PATCH toggle pin
        ├── status/route.ts                            PATCH change status
        ├── move/route.ts                              PATCH move to board
        ├── merge/route.ts                             POST merge into post
        └── approve/route.ts                           PATCH approve (moderation)

components/posts/
├── post-card.tsx            Post summary card (list view)
├── post-detail.tsx          Full post body + metadata
├── submit-post-modal.tsx    Modal for submitting a new post
├── admin-post-toolbar.tsx   Team actions bar (pin/status/move/merge/approve/delete)
├── author-actions.tsx       Edit/delete actions for the post author
├── status-badge.tsx         Coloured status pill
├── status-select.tsx        Team status-change dropdown
├── board-controls.tsx       Sort + filter controls above the post list
├── merge-post-modal.tsx     Search + select target post to merge into
└── move-post-modal.tsx      Select target board to move post to

lib/posts/{queries,create,update,delete,merge,index}.ts
lib/worker/handlers/send-new-post-alert.ts             Notify the team of a new post
lib/email/templates/new-post-alert.ts                  Email HTML template
```

### Public board page (`app/(public)/[ws-slug]/b/[board-slug]/page.tsx`)
Server component: fetch board by workspace + board slug; 404 if private and viewer is not a member; show archived banner (no submit) if archived; fetch paginated posts (default `sort=trending`, `is_approved=true`, merged excluded); render `<BoardControls />`, the post list (pinned first), and the `<SubmitPostModal />` trigger; `generateMetadata()` for SEO.

### Post detail page (`app/(public)/[ws-slug]/b/[board-slug]/p/[postId]/page.tsx`)
Server component: resolve id from the `[postId]` param (see URL Resolution); 404 if not found; canonical board-slug check with redirect; render `<PostDetail />`, `<VoteButton />` (Feature 06), `<AdminPostToolbar />` for the team, `<AuthorActions />` for the author, comment thread (Feature 07); `generateMetadata()` for SEO.

### `submit-post-modal.tsx`
Dialog with Title (required, 5–150, live count), Description (optional, max 5000, live count), Category select (Feature 08), and Name + Email fields shown when not signed in. Debounced client-side duplicate detection via `GET posts?search=`. Posts to `/api/boards/[boardId]/posts`; toasts "Post submitted!" or "Your post is pending review" based on `is_approved`.

### `admin-post-toolbar.tsx`
Shown to the team on post detail: Pin/Unpin (`/pin`), Status (`<StatusSelect />`), Move (`<MovePostModal />`), Merge (`<MergePostModal />`), Approve (only when `is_approved = false`), Delete (confirm → DELETE).

### `author-actions.tsx`
Shown to the post's author: inline Edit (title + description), Delete (confirm; only when `vote_count = 0`).

### `status-badge.tsx`
Colour map — open: grey · under_review: yellow · planned: blue · in_progress: purple · completed: green · closed: red.

### `board-controls.tsx`
Sort tabs (Trending / Newest / Top Voted), status filter dropdown, category filter (Feature 08), "My Votes" toggle (signed-in, Feature 06), post count. Updates URL query params via `router.replace` (no reload).

### `merge-post-modal.tsx` / `move-post-modal.tsx`
Merge: search posts by title in the workspace, pick target, confirm ("All votes will be transferred"), POST `/merge`. Move: list workspace boards (excluding current), pick target, confirm, PATCH `/move`, redirect to the new URL.

---

## Background Jobs

### `SEND_NEW_POST_ALERT`

- **Trigger:** `createPost()` when `is_approved = true`, or `approvePost()` after manual moderation.
- **Handler:** `lib/worker/handlers/send-new-post-alert.ts` — sends one email to all Brand Admin + Team Member recipient emails in the workspace. Subject: `New post on {boardName}: {postTitle}`. Body: title, author, board name, link.
- **Payload:**

```ts
{
  postId: string
  postTitle: string
  postUrl: string
  authorName: string
  boardName: string
  workspaceName: string
  adminEmails: string[]   // workspace recipient emails (Brand Admin + Team Members)
}
```

See [`../JOBS.md`](../JOBS.md) for the queue. `SEND_STATUS_CHANGE_EMAIL` (enqueued by `changeStatus`) is owned by Feature 11.

---

## Technical Notes

- `postId` URL param is `{cuid2}-{readable-slug}`; extract the id by splitting on `-` and taking the first segment (cuid2 has no hyphens).
- `vote_count` / `comment_count` are denormalised counters updated incrementally; guard decrements with `GREATEST(count - 1, 0)`.
- Description is stored as plain `text` (no JSON/HTML). Rich text (Tiptap/ProseMirror) is a post-MVP enhancement.
- `author_id` uses `SET NULL` on user deletion; posts persist with `author_name` / `author_email` for display.
- The trending sort is computed in the SQL `ORDER BY` via PostgreSQL `EXTRACT` — no materialised view at MVP scale.
- `post_status_changes` is append-only (audit trail).
- The `post_attachments` table is created in the migration but no upload endpoint is built; `PostDetail` has an `attachments` prop typed `Attachment[]` defaulting to `[]`.
- `vote_count` reconciliation: denormalised for performance; a periodic reconciliation job can be added post-MVP.
