# Implementation — Feature 06: Voting

> Implementation reference for Feature 06 — Voting. Product behaviour: ../../features/06-voting.md

This document holds the technical detail removed from the product spec. Schema is owned by [`../DATABASE.md`](../DATABASE.md) — referenced here, not duplicated.

> **MVP scope note.** Voting **requires a signed-in User** (see [product spec](../../features/06-voting.md) and [PLATFORM.md](../../PLATFORM.md)). Any anonymous / email-based ("guest") voting, CAPTCHA, and per-IP rate-limiting described below is **not part of the MVP** — treat it as future-scope design only.
>
> **Implemented (Phase 1 — sign-in participation).** Guest voting has been removed from the code:
> - `POST`/`DELETE /api/posts/[postId]/vote` now return **401 "Sign in to vote."** when there is no session; they no longer accept an `email`/`name` body or an `?email=` query param.
> - `castVote` and `removeVote` take `{ userId }` only — the email-based vote paths have been removed.
> - `vote-button.tsx` routes a not-signed-in visitor to `/login?next=…` instead of opening a guest dialog; the guest vote dialog component has been deleted.
> - The read helpers in `lib/voting/list.ts` (`listVoters`, `hasUserVoted`, `getVotedPostIds`) retain backward-compatible signatures; the email-bearing `votes` columns remain in the schema but are no longer written, reserved for possible future anonymous participation. The "Abuse Protection" and email-dedup material below is therefore **future-scope design**, not current behaviour.

---

## Dependencies

```
sonner          — toast notifications for vote errors (Toaster mounted in root layout)
```

No new environment variables for the data layer (uses `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`). Abuse protection adds the variables noted under [Abuse Protection](#abuse-protection).

---

## Database

The `votes` table is defined in [`../DATABASE.md`](../DATABASE.md). Key points relevant to behaviour:

- Columns: `id` (cuid2 PK), `post_id` → `posts.id` (CASCADE DELETE), `workspace_id` → `workspaces.id` (CASCADE DELETE), `user_id` → `user.id` (SET NULL on delete), `user_email` (set for not-signed-in voters; null for signed-in), `user_name` (display name for not-signed-in voters), `created_at`.
- `workspace_id` is denormalised onto each vote row to enable efficient workspace-level queries without joining through `posts`.
- **One vote per identity per post** is enforced with two partial unique indexes:
  - `UNIQUE (post_id, user_id)` WHERE `user_id IS NOT NULL`
  - `UNIQUE (post_id, user_email)` WHERE `user_email IS NOT NULL`
- These partial unique indexes are created manually in the SQL migration — Drizzle ORM does not support partial unique indexes declaratively at current versions; use raw SQL in the migration file.
- Supporting indexes: `post_id`, `user_id`, `workspace_id`, `(post_id, user_id)`, `(post_id, user_email)`.
- `posts.vote_count` is a denormalised counter (owned by `posts` — see DATABASE.md and Feature 05), maintained by the service layer (see [Vote Counting](#vote-counting)).

> **Edge case — same email signed-in and not-signed-in.** A signed-in user who previously voted by email holds two separate rows (one by `user_id`, one by `user_email`) until de-duplicated. De-duplication runs at cast time — see [`castVote`](#service-layer).

---

## File Structure

```
app/
└── api/
    └── posts/
        └── [postId]/
            └── vote/
                ├── route.ts            POST (cast vote) / DELETE (remove vote)
                └── voters/
                    └── route.ts        GET voter list (team only)

components/
└── voting/
    ├── vote-button.tsx                 Upvote button with count + optimistic UI
    ├── guest-vote-dialog.tsx           Email prompt dialog for not-signed-in voters
    └── voter-list-modal.tsx            Team modal: who voted on this post

lib/
└── voting/
    ├── cast.ts                         Cast vote service
    ├── remove.ts                       Remove vote service
    ├── list.ts                         List voters service
    └── index.ts                        Re-exports
```

---

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/posts/[postId]/vote` | Optional session | Cast a vote |
| DELETE | `/api/posts/[postId]/vote` | Optional session | Remove a vote |
| GET | `/api/posts/[postId]/vote/voters` | Brand Admin / Team Member | List all voters |

### `POST /api/posts/[postId]/vote` — Cast a vote

```
Auth: Optional session (not-signed-in voters allowed with email)
Body (if not signed in): { email: string, name?: string, captchaToken: string }
Body (if signed in):     {} (empty — identity from session)

Logic:
  - If session: castVote(postId, workspaceId, { userId: session.user.id })
  - If no session:
      → verify captchaToken server-side
      → on failure: 422 { error: "CAPTCHA verification failed" }
      → on success: castVote(postId, workspaceId, { userEmail, userName })

Validation:
  - email required and valid format, max 255 chars
  - name optional, max 100 chars
  - captchaToken required and verified server-side

Returns:
  201 { voteId, voteCount }   — new vote cast
  200 { voteId, voteCount }   — already voted (idempotent)
  422 { error }               — blocked (merged, locked, archived, unapproved) or CAPTCHA fail
  429 { error }               — rate limit exceeded
```

### `DELETE /api/posts/[postId]/vote` — Remove a vote

```
Auth: Optional session (not-signed-in voters can remove by email)
Query param (if not signed in): ?email=person@example.com
  (DELETE bodies are stripped by many CDNs/proxies — use a query param instead)

Logic:
  - If session: removeVote(postId, { userId: session.user.id })
  - If no session:
      → requires query param email
      → verifies a vote row exists for (postId, email) BEFORE deleting
        → if no matching row: 404 { error: "Vote not found" }
        → prevents IDOR — a caller cannot remove another person's vote by guessing their email

Returns:
  204                         — vote removed (or already absent — idempotent)
  404 { error }               — no vote found for this email on this post
```

### `GET /api/posts/[postId]/vote/voters` — List voters

```
Auth: requireRole(['owner', 'admin'])  // Brand Admin / Team Member (legacy role values)
Query: page=1, limit=50
Returns: { voters: Voter[], total: number }
  Voter: { id, name, email, avatar, votedAt, isGuest }
```

---

## Service Layer

### `lib/voting/cast.ts`

```ts
castVote(postId, workspaceId, { userId?, userEmail?, userName? })
  → exactly one of userId or userEmail must be provided

  Pre-flight checks (in order):
    1. Fetch post — if not found: throw NotFoundError
    2. If post.merged_into_id IS NOT NULL: throw "This post has been merged. Vote on the original instead."
    3. If post.is_locked: throw "This post is locked and no longer accepting votes."
    4. If post.is_approved = false: throw "This post is not yet published."
    5. Fetch board — if board.is_archived: throw "This board is archived."

  If userId provided:
    → SELECT from votes WHERE post_id = postId AND user_id = userId
    → if exists: return existing vote (idempotent, no error)
    → also SELECT from votes WHERE post_id = postId AND user_email = (user's email)
      → if a not-signed-in vote exists for the same email: delete it first (de-duplicate)

  If userEmail provided (not signed in):
    → SELECT from votes WHERE post_id = postId AND user_email = userEmail
    → if exists: return existing vote (idempotent, no error)

  In db.transaction():
    → INSERT INTO votes (id, post_id, workspace_id, user_id, user_email, user_name, created_at)
    → UPDATE posts SET vote_count = vote_count + 1 WHERE id = postId

  → returns new vote
```

### `lib/voting/remove.ts`

```ts
removeVote(postId, { userId?, userEmail? })
  → exactly one of userId or userEmail must be provided

  Find vote:
    → if userId:    WHERE post_id = postId AND user_id = userId
    → if userEmail: WHERE post_id = postId AND user_email = userEmail
    → if not found: return void (idempotent, no error)

  In db.transaction():
    → DELETE FROM votes WHERE id = vote.id
    → UPDATE posts SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = postId

  → returns void
```

### `lib/voting/list.ts`

```ts
listVoters(postId, { page = 1, limit = 50 })
  → SELECT votes joined with user (name, email, avatar)
  → for not-signed-in votes: use votes.user_name and votes.user_email directly
  → ORDER BY votes.created_at DESC
  → returns { voters: Voter[], total: number }

getVotedPostIds(workspaceId, { userId?, userEmail? })
  → returns array of post IDs the identity has voted on
  → used for the "My Votes" filter and the hasVoted flag in the post list response
```

### "My Votes" filter — in `listPosts()`

```ts
if (filters.myVotes && filters.userId) {
  query.where(
    inArray(posts.id,
      db.select({ id: votes.postId })
        .from(votes)
        .where(eq(votes.userId, filters.userId))
    )
  )
}
```

The "My Votes" chip is rendered in `<BoardControls />` only for signed-in users; it toggles `myVotes=true` in the URL query params.

### `hasVoted` flag — in `listPosts()`

```ts
// If userId provided, LEFT JOIN votes to compute hasVoted per post
SELECT posts.*,
  CASE WHEN v.id IS NOT NULL THEN true ELSE false END as has_voted
FROM posts
LEFT JOIN votes v
  ON v.post_id = posts.id AND v.user_id = :userId
WHERE ...
```

`<VoteButton />` receives `initialHasVoted` from the server-rendered list — no per-post client fetch on load. For not-signed-in visitors (no session) `hasVoted = false` for all posts (state is not persisted client-side in MVP — see [Technical Notes](#technical-notes)).

---

## Components

### `components/voting/vote-button.tsx`

Client component on every `<PostCard />` and the post detail page.

**Props:**
```ts
{
  postId: string
  initialCount: number
  initialHasVoted: boolean
  isLocked?: boolean        // merged or locked posts
  isArchived?: boolean      // archived board
}
```

**State:** `count: number`, `hasVoted: boolean`, `isPending: boolean`.

**Render:** upvote chevron (filled when `hasVoted`) above the count. Background is the primary colour when voted, grey otherwise. Disabled and greyed when `isLocked`/`isArchived`, with tooltip "Voting is closed".

**Click (signed in):**
```
1. isPending = true
2. Optimistic update: toggle hasVoted, adjust count ± 1
3. POST (vote) or DELETE (remove)
4. On success: confirm state, isPending = false
5. On error: revert hasVoted + count, isPending = false, show toast
```

**Click (not signed in):**
```
1. Opens <GuestVoteDialog />
2. Enter email (+ optional name)
3. POST /api/posts/[postId]/vote { email, name }
4. On success: optimistic update applied, dialog closes
5. On error: toast + dialog stays open
```

### `components/voting/guest-vote-dialog.tsx`

Client dialog for not-signed-in voters:
- Title: "Vote on this idea"
- Body: "Enter your email to cast your vote. You can remove it at any time."
- Fields: Email (required, validated), Name (optional)
- Submit: "Cast Vote"
- Already-voted state: "You've already voted from this email. Remove your vote?" with a "Remove Vote" button
- "Sign in instead" link → `/signin`

### `components/voting/voter-list-modal.tsx`

Client dialog, team only (Brand Admin / Team Member).
- **Trigger:** "See who voted ({count})" link on post detail — visible only to the team.
- Fetches voters lazily on open.
- Shows avatar / name / email / "Guest" badge (for not-signed-in voters) / relative date.
- Paginated (load more on scroll or button); total count in header.
- Read-only — no per-vote removal in the UI.

---

## Abuse Protection

Not-signed-in vote casting is protected server-side:

- **CAPTCHA verification** on the not-signed-in `POST` path (hCaptcha or Cloudflare Turnstile — both have free tiers). Site key is the public env var `NEXT_PUBLIC_CAPTCHA_SITE_KEY`; the server-side verification secret is `CAPTCHA_SECRET_KEY`. Failed verification returns `422 { error: "CAPTCHA verification failed" }`.
- **Rate limiting** by IP: 10 not-signed-in casts per hour per IP, tracked with a sliding-window counter stored in PostgreSQL (no Redis required). Exceeding the limit returns `429`.

These are server-side controls only; they do not change the product rule that any User may vote.

---

## Vote Counting

`posts.vote_count` is the denormalised source of truth for display — never recalculated from `COUNT(votes)` on every page load. Maintained atomically inside `db.transaction()` on each action:

- `castVote`: `UPDATE posts SET vote_count = vote_count + 1`
- `removeVote`: `UPDATE posts SET vote_count = GREATEST(vote_count - 1, 0)` (prevents negatives)
- On `mergePosts` (Feature 05): votes are transferred (`UPDATE votes SET post_id = targetId`) and the target's count is **recalculated from actual rows** (not incremented) for accuracy:
  ```ts
  UPDATE posts SET vote_count = (
    SELECT COUNT(*) FROM votes WHERE post_id = targetPostId
  ) WHERE id = targetPostId
  ```

---

## Optimistic UI Detail

`<VoteButton />` uses a local state pattern:

```
User clicks vote:
  1. Immediately: hasVoted = true, count = count + 1, isPending = true
  2. API call fires in background
  3a. Success: isPending = false — state confirmed
  3b. Error:
       - hasVoted = false (reverted), count = count - 1 (reverted)
       - isPending = false
       - sonner toast with the API error message, e.g.
           "This post has been merged."
           "This board is archived."
```

---

## Technical Notes

- Cast and remove are **separate endpoints** (`POST` / `DELETE`), not a single toggle — makes client intent explicit and avoids races where two rapid clicks toggle unexpectedly.
- Not-signed-in vote removal passes the email as a **query parameter** (`?email=`), not a body — DELETE bodies are stripped by many CDNs and proxies.
- Not-signed-in vote removal verifies the row exists before deleting — prevents IDOR where a caller knowing a victim's email could remove their vote.
- `votes.user_name` for not-signed-in voters is stored for voter-list display only — not verified or linked to any account.
- `votes.user_id` uses SET NULL on user deletion — the vote row is preserved and the voter renders as "Deleted User" in the voter list.
- Concurrency: two simultaneous votes from the same identity are caught by the partial unique index — the second INSERT fails and the endpoint returns 200 (already voted).
- **Not-signed-in vote persistence (MVP limitation):** a not-signed-in vote is persisted in the database by email and counts toward `vote_count` and the voter list, but on a later visit the voter's `hasVoted` state is **not restored** in the UI (no cookie/localStorage for vote state in MVP). Post-MVP: set a `guest_email` cookie after a not-signed-in vote and use it to restore `hasVoted` on load.

---

## Edge Cases (technical handling)

| Case | Handling |
|---|---|
| Signed-in user votes on a post they already voted on | `castVote` returns 200 (idempotent), no duplicate row |
| Not-signed-in vote with an email matching a signed-in user's email | Recorded against email, not linked to the account. If that user signs in and votes, the email vote is deleted and a user vote created (de-dup in `castVote`) |
| Remove a vote that doesn't exist | `removeVote` returns void — no error |
| `vote_count` would go below 0 | `GREATEST(vote_count - 1, 0)` prevents negatives |
| Vote on merged / archived-board / unapproved post | Pre-flight check blocks with the matching message |
| Two simultaneous votes from same identity | Partial unique index catches the race; second INSERT fails → 200 |
| Voter's account deleted | `votes.user_id` SET NULL — row preserved, shown as "Deleted User" |
| Post merged — votes on source | `mergePosts` reparents votes; target `vote_count` recalculated from rows |
| Board archived after votes cast | Votes preserved; button disabled, historical count remains |
