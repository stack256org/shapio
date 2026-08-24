# Implementation — Feature 07: Comments

> Implementation reference for Feature 07 — Comments. Product behaviour: ../../features/07-comments.md

This document holds the technical detail removed from the product spec. Schema is owned by [`../DATABASE.md`](../DATABASE.md) — referenced here, not duplicated.

> **MVP scope note.** Commenting **requires a signed-in User** (see [product spec](../../features/07-comments.md) and [PLATFORM.md](../../PLATFORM.md)). Any anonymous / email-based ("guest") commenting described below is **not part of the MVP** — treat it as future-scope design only.
>
> **Implemented (Phase 1 — sign-in participation).** Guest commenting has been removed from the code:
> - `POST /api/posts/[postId]/comments` now returns **401 "Sign in to comment."** when there is no session; it no longer accepts `authorEmail`/`authorName` and no longer runs guest validation.
> - `createComment` throws if `authorId` is missing — the author is always the signed-in user; `authorEmail`/`authorName` are snapshotted from the session, not supplied by the caller.
> - `comment-form.tsx` shows a "Sign in to join the conversation" prompt (link to `/login`) to not-signed-in visitors instead of guest name/email inputs.
> - `GET` listing still returns an `isGuest` flag (now always `false` for new comments); the author email/name columns remain in the schema but are no longer written by the comment-create path, reserved for possible future anonymous participation.
>
> **Implemented (Phase 3 — Team Member clean-up).** `deleteComment` (`lib/comments/delete.ts`) now allows **any workspace member** to remove a comment (clean-up, PLATFORM.md §4), not just admins/owners; authors may still remove their own. The DELETE route still enforces workspace membership. Comment **approval / moderation queue / unapproved visibility** (`canModerate`) remains **Brand-Admin-only**.

---

## Dependencies

```
pg-boss         — enqueue comment notification emails
nodemailer      — deliver comment + reply emails
```

No new environment variables beyond Feature 01.

---

## Database

The `comments` table is defined in [`../DATABASE.md`](../DATABASE.md). Key points relevant to behaviour:

- `comments.post_id` references `posts.id` with `CASCADE DELETE` — deleting a post hard-deletes its comments.
- `comments.parent_id` references `comments.id` with `SET NULL` on delete. `null` = top-level comment; a set value = reply to a top-level comment.
- `comments.is_approved` defaults to `true`; it is `false` when `workspace.comment_moderation = true`, until approved.
- `comments.is_deleted` is the soft-delete flag. On soft delete the row is retained; `body` becomes `[deleted]` and `author_id` / `author_email` / `author_name` / `author_avatar` are cleared.
- `comments.author_id` uses `SET NULL` on user deletion; `author_email` / `author_name` / `author_avatar` are snapshots captured at comment time (not refreshed when the user later changes their profile).
- `author_email` is stored only for sending notification emails server-side; it is **never** returned in any API response.
- `posts.comment_count` is a denormalised counter, incremented on a new approved comment and decremented on delete (using `GREATEST(comment_count - 1, 0)` to avoid negatives). Only approved comments count.

**Validation rules enforced at the data layer:**
- `parent_id` must reference a comment with `parent_id IS NULL` (top-level only).
- `parent_id` must reference a comment on the same `post_id`.
- `body` is 1–5000 chars, not blank after trim.

**Indexes** (see DATABASE.md for the authoritative list): `post_id`, `parent_id`, `author_id`, and `(post_id, is_approved, is_deleted)` for listing visible comments.

---

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/posts/[postId]/comments` | Public / Member | List comments + replies |
| POST | `/api/posts/[postId]/comments` | Optional session | Create comment or reply |
| DELETE | `/api/comments/[commentId]` | Author / team | Soft delete comment |
| PATCH | `/api/comments/[commentId]/approve` | Team | Approve pending comment |

> "Team" = Brand Admin and permitted Team Members. Internally enforced via the workspace-member/permission guard (legacy `requireRole(['owner','admin'])` checks map to this; `owner`/`admin` are stored values that mean Brand Admin, `member` means Team Member — see [`../DATABASE.md`](../DATABASE.md)).

### `GET /api/posts/[postId]/comments`

```
Auth: Public (if board is public) or requireWorkspaceMember (private board)
Query: includeUnapproved=true (team only)

Returns:
  CommentWithReplies[] — top-level comments with nested replies
  Structure:
  [
    {
      id, body, authorName, authorAvatar, isGuest, createdAt, isDeleted,
      replies: [
        { id, body, authorName, authorAvatar, isGuest, createdAt, isDeleted }
      ]
    }
  ]

Note:
  - Deleted comments: body = "[deleted]", author fields = null
  - Unapproved comments excluded for non-team requests
  - author_email NEVER returned in API response (privacy)
```

### `POST /api/posts/[postId]/comments`

```
Auth: Optional session (not-signed-in Users allowed)
Body:
  {
    body: string,
    parentId?: string,
    authorEmail?: string,   -- required for not-signed-in Users
    authorName?: string,    -- required for not-signed-in Users
  }

Validates:
  - body: required, 1–5000 chars, not blank after trim
  - parentId: if provided, must be a top-level comment on this post
  - not signed in: authorEmail required, valid format
  - not signed in: authorName required, 1–100 chars

Returns:
  201 + comment (with is_approved flag)
  If is_approved = false: client shows "Your comment is pending review"
```

### `DELETE /api/comments/[commentId]`

```
Auth: Session required
  - Author can delete their own comment
  - Team can delete any comment

Returns: 204

Note: This is a soft delete — body becomes "[deleted]"
      The comment row is never hard-deleted in MVP
```

### `PATCH /api/comments/[commentId]/approve`

```
Auth: requireRole(['owner', 'admin'])  -- maps to Brand Admin (and permitted Team Members)

Logic:
  → UPDATE comments SET is_approved = true
  → UPDATE posts SET comment_count = comment_count + 1
  → Enqueue notification emails (same as in createComment)

Returns: updated comment
```

---

## Service Layer

### `lib/comments/queries.ts`

```ts
listComments(postId, { includeUnapproved = false, userId? })
  → fetches all non-deleted top-level comments for postId
  → for each top-level comment: fetches its replies (parent_id = comment.id)
  → excludes unapproved unless includeUnapproved = true (team flag)
  → structure returned:
    CommentWithReplies[] = {
      ...comment,
      replies: Comment[]
    }
  → sorted: top-level by created_at ASC (oldest first)
  → replies sorted by created_at ASC within each parent

getCommentById(commentId)
  → returns single comment or null

getPendingComments(workspaceId)
  → returns unapproved comments across all posts in this workspace
  → joined with post (title, boardSlug) for context
  → sorted by created_at ASC (oldest first in queue)

getCommentCount(postId)
  → COUNT of approved, non-deleted comments (top-level + replies)
```

### `lib/comments/create.ts`

```ts
createComment(postId, {
  body,
  parentId?,
  authorId?,
  authorEmail?,
  authorName?,
  authorAvatar?,
}, workspaceId)

  Pre-flight checks:
    1. Fetch post — if not found: throw NotFoundError
    2. If post.is_locked: throw "Comments are closed on this post."
    3. If post.is_approved = false: throw "This post is not yet published."
    4. If parentId provided:
       → Fetch parent comment
       → If parent not found: throw "Parent comment not found."
       → If parent.parent_id IS NOT NULL: throw "Replies to replies are not allowed."
       → If parent.post_id !== postId: throw "Parent comment does not belong to this post."

  Determine approval:
    → Fetch workspace.comment_moderation
    → is_approved = !workspace.comment_moderation

  Snapshot author info:
    → If authorId: fetch user name + avatar → store in author_name, author_avatar
    → If not signed in: use provided authorName, set author_avatar = null

  In db.transaction():
    → INSERT INTO comments (...)
    → If is_approved:
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = postId

  Post-insert (if is_approved):
    → If parentId IS NULL (top-level comment):
        → Enqueue SEND_NEW_COMMENT_EMAIL to post author
          (skip if post.author_id = comment.author_id — don't email yourself)
    → If parentId IS NOT NULL (reply):
        → Fetch parent comment author
        → Enqueue SEND_COMMENT_REPLY_EMAIL to parent comment author
          (skip if parent.author_id = comment.author_id — don't email yourself)

  → returns comment
```

### `lib/comments/delete.ts`

```ts
deleteComment(commentId, requesterId, requesterRole)
  → fetch comment
  → if not found: throw NotFoundError

  Permission check:
    → if requesterRole is admin/owner (Brand Admin / permitted Team Member): allowed
    → else: verify requesterId = comment.author_id

  In db.transaction():
    → UPDATE comments SET
        body = '[deleted]',
        is_deleted = true,
        author_id = null,
        author_email = null,
        author_name = null,
        author_avatar = null,
        updated_at = now()
      WHERE id = commentId
    → If comment was approved (is_approved = true):
        UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0)
          WHERE id = comment.post_id

  → returns void

  Note: replies to this comment are NOT deleted — they remain visible.
        The deleted comment shows as "[deleted]" in the thread.
```

`lib/comments/index.ts` re-exports the read and write operations above.

---

## Components

```
components/
└── comments/
    ├── comment-section.tsx                 Full comment section wrapper
    ├── comment-thread.tsx                  Renders top-level comments + their replies
    ├── comment-item.tsx                    Single comment (body, author, actions)
    ├── comment-form.tsx                    New comment / reply input form
    ├── comment-reply-form.tsx              Inline reply form (opens below a comment)
    └── comment-moderation-queue.tsx        Team: pending comments list
```

### `comment-section.tsx`

Server component wrapper rendered on the post detail page:
- Fetches comments via `listComments(postId, { includeUnapproved: isTeamMember })`
- Passes data to client components
- Shows comment count header: "{n} Comments"
- Renders `<CommentThread />` + `<CommentForm />` (for new top-level comments)
- If `workspace.comment_moderation = on` AND user is on the team: shows moderation queue link
- If post is locked: shows "Comments are closed" message, hides form

### `comment-thread.tsx`

Client component:
- Renders the flat list of top-level comments
- For each comment: renders `<CommentItem />` + its replies
- Replies are indented visually (left border / padding)
- "Load more" if there are more than 20 top-level comments (pagination)

### `comment-item.tsx`

Client component for a single comment.

**Displays:**
- Author avatar (or initials fallback)
- Author name + a badge for a not-signed-in commenter
- Relative timestamp ("2 hours ago"), absolute on hover tooltip
- Comment body (or "[deleted]" styled in muted colour if is_deleted)
- "Reply" button (hidden on replies — no nested nesting)
- "Delete" button (shown to comment author or team)
- Pending badge (shown to the team if is_approved = false)

**Interactions:**
- "Reply" → opens inline `<CommentReplyForm />` below this comment
- "Delete" → AlertDialog confirm → DELETE `/api/comments/[commentId]`
  - Optimistic: body replaced with "[deleted]", author info cleared
  - On error: revert + toast

### `comment-form.tsx`

Client component — new top-level comments at the bottom of the thread.

**Props:**
```ts
{
  postId: string
  onSuccess: (comment: Comment) => void
}
```

**Fields:**
- Textarea: body (required, 1–5000 chars, live char count)
- If not signed in: Name input (required), Email input (required)
- Submit button: "Post Comment"

**Behaviour:**
- Submit → POST `/api/posts/[postId]/comments`
- On success (approved): new comment appended to thread, form cleared
- On success (pending): toast "Your comment is pending review", form cleared
- On error: toast with error message

### `comment-reply-form.tsx`

Client component — inline form below a specific comment.

**Props:**
```ts
{
  postId: string
  parentId: string
  onSuccess: (reply: Comment) => void
  onCancel: () => void
}
```

**Fields:**
- Textarea: body (same validation as comment-form)
- Not-signed-in fields if not signed in (same as comment-form)
- "Reply" button + "Cancel" link

**Behaviour:**
- Submit → POST `/api/posts/[postId]/comments` with `parentId`
- On success: reply appended under parent, form collapses
- "Cancel" collapses form without submitting

### `comment-moderation-queue.tsx`

Client component — shown in the team board or post view when moderation is on.

**Displays:**
- Count of pending comments: "3 comments pending review"
- List of pending comments with: post title, comment body preview, author, time
- "Approve" button per comment → PATCH `/api/comments/[commentId]/approve`
- "Delete" button per comment → DELETE `/api/comments/[commentId]`
- Clicking post title navigates to post detail

---

## Background Jobs

See [`../JOBS.md`](../JOBS.md) for the queue overview.

### `SEND_NEW_COMMENT_EMAIL`

**Trigger:** New top-level comment created + approved
**Condition:** Only sent if commenter is not the post author (no self-notification)

**Payload:**
```ts
{
  postAuthorEmail: string
  postAuthorName: string
  postTitle: string
  postUrl: string
  commenterName: string
  commentBody: string       // truncated to 300 chars
  workspaceName: string
}
```

**Handler:** `lib/worker/handlers/send-new-comment-email.ts`
- Template: `lib/email/templates/new-comment.ts`
- Subject: `"{commenterName} commented on your post — {postTitle}"`
- Body: commenter name, comment preview, link to post

### `SEND_COMMENT_REPLY_EMAIL`

**Trigger:** Reply created + approved on a comment
**Condition:** Only sent if replier is not the parent comment author

**Payload:**
```ts
{
  parentAuthorEmail: string
  parentAuthorName: string
  postTitle: string
  postUrl: string
  replierName: string
  replyBody: string         // truncated to 300 chars
  workspaceName: string
}
```

**Handler:** `lib/worker/handlers/send-comment-reply-email.ts`
- Template: `lib/email/templates/comment-reply.ts`
- Subject: `"{replierName} replied to your comment on {postTitle}"`
- Body: replier name, reply preview, link to post

---

## Moderation Flow (internals)

```
workspace.comment_moderation = false (default):
  → comment.is_approved = true
  → comment appears immediately
  → comment_count incremented
  → notification emails sent

workspace.comment_moderation = true:
  → comment.is_approved = false
  → comment NOT visible to public
  → comment_count NOT incremented
  → NO notification emails (email sent only after approval)
  → Team sees pending comment in moderation queue
  → Approve → is_approved = true, count incremented, emails sent
  → Delete → soft delete, no count change
```

---

## Technical Notes

- Author name and avatar are **snapshotted** at comment creation (`author_name`, `author_avatar` columns) — they do not update if the user later changes their profile. Intentional for comment history integrity.
- `author_email` is stored for not-signed-in commenters but **never returned in any API response** — used only for sending reply notification emails server-side.
- Hard delete is intentionally avoided — soft delete preserves thread context and prevents orphaned replies from losing their parent.
- The `[deleted]` body string is a literal constant — define it in `config/platform.ts` as `DELETED_COMMENT_BODY = "[deleted]"` so it can be checked consistently in the UI.
- Reply depth is enforced at the service layer (`parent.parent_id IS NOT NULL` check) — not just the UI — to prevent API abuse.
- `comment_count` is only incremented for **approved** comments — pending comments do not count until approved.
- When a moderation approval triggers emails, the same email logic from `createComment` is reused — extract it into a shared `sendCommentNotifications(comment)` helper to avoid duplication.
- Validation reference:

  | Field | Rules |
  |---|---|
  | `body` | Required, 1–5000 chars, must not be blank after trim |
  | `parentId` | Must be a top-level comment (`parent_id IS NULL`) on same post |
  | `authorEmail` (not signed in) | Required if no session, valid email format |
  | `authorName` (not signed in) | Required if no session, 1–100 chars |

- Edge-case handling (internals):

  | Case | Handling |
  |---|---|
  | Reply to a reply attempted (API directly) | `createComment` checks `parent.parent_id IS NOT NULL` → throws error |
  | Reply to a deleted comment | Allowed — deleted comments retain their ID and structure; reply is valid |
  | Comment on locked post | Pre-flight check: `post.is_locked = true` → throws "Comments are closed on this post" |
  | Comment on unapproved post | Pre-flight check blocks — unapproved posts not visible publicly anyway |
  | Author account deleted | `author_id` SET NULL — comment body preserved, author shown as "Deleted User" |
  | Post deleted | `CASCADE DELETE` on `comments.post_id` → all comments hard-deleted |
  | `comment_count` drifts | Counter only changes inside `db.transaction()`. Drift can happen if a transaction partially fails — a reconciliation query can be run post-MVP |
  | Double submit | No de-duplication in MVP — two comments created. Mitigated by disabling submit button during in-flight request |
  | Not-signed-in commenter email cleared on delete | `author_email` cleared from DB on soft delete (GDPR-friendly) |
</content>
</invoke>
