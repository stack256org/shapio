# Implementation — Feature 04: Feedback Boards

> Implementation reference for Feature 04 — Feedback Boards. Product behaviour: ../../features/04-feedback-boards.md

This document holds the technical detail removed from the product spec. Schema is owned by [`../DATABASE.md`](../DATABASE.md) — referenced here, not duplicated.

> **Phase 2 status (public portal).** A board's public-facing page lives in the **public** route group (`app/(public)/[slug]/b/[boardSlug]/`). A board with `isPublic = true` is readable by anyone; private boards are members-only (`notFound()` otherwise).

> **Implemented (Phase 4 — board management).** Brand-Admin board lifecycle is now built:
> - **Service layer:** `lib/boards/create.ts` (`createBoard`, `generateBoardSlug`, `validateBoardSlug`, `slugifyBoard`), `lib/boards/update.ts` (`updateBoard`, `reorderBoards` — workspace-scoped), `lib/boards/delete.ts` (`deleteBoard` — relies on the `posts → votes/comments` cascade), and `lib/boards/queries.ts` (`listBoardsForWorkspace` with post counts, `getBoardById`, `countActiveBoards`).
> - **Server actions:** `app/actions/boards.ts` — `createBoardAction`, `updateBoardAction`, `setBoardArchivedAction`, `deleteBoardAction`, `reorderBoardsAction`. All are **Brand-Admin-only** (`requireBoardManager` denies Team Members). The active-board limit (`MAX_BOARDS_PER_WORKSPACE`) is enforced on create and on unarchive; the **last active board cannot be deleted** (archived boards always can); slugs are validated against `RESERVED_BOARD_SLUGS` and per-workspace uniqueness.
> - **UI:** `components/boards/board-list.tsx` + `app/(workspace)/[slug]/settings/boards/` (create/edit form with name, slug, description, visibility; reorder via up/down; archive/unarchive; delete with type-the-name confirmation). A **Boards** link was added to the Brand-Admin settings nav.
> - **Archived behaviour:** the workspace sidebar query now filters `isArchived = false`; an archived board stays **publicly readable** (read-only) with a "no longer accepting feedback" notice and the New-post action hidden (reconciling the Phase 2 gate, which had `notFound()`d archived boards).

---

## Dependencies

```
@paralleldrive/cuid2    — generate board IDs
slugify                 — auto-generate slug from board name
```

No new environment variables. Uses `DATABASE_URL` and `NEXT_PUBLIC_APP_URL`.

---

## Config

**`config/platform.ts`**

```ts
export const MAX_BOARDS_PER_WORKSPACE = 10

export const RESERVED_BOARD_SLUGS = [
  "settings", "new", "create", "edit", "delete",
  "archive", "reorder", "roadmap", "changelog",
  "notifications", "members", "api",
]
```

---

## Database

The `boards` table is defined in [`../DATABASE.md`](../DATABASE.md). Key points relevant to behaviour:

- `boards.is_public` defaults to `true`; `boards.is_archived` defaults to `false`.
- `boards.display_order` (integer, default `0`) drives ordered list queries; ordering is by value, so gaps are fine.
- `boards.workspace_id` references `workspaces.id` with `CASCADE DELETE`. Deleting a board hard-deletes all posts, votes, and comments inside it via `CASCADE`.
- `boards.created_by` references `user.id`.
- `updated_at` must be set manually on every `UPDATE` — no DB trigger.

**Indexes** (see DATABASE.md for the authoritative list):
- `UNIQUE (workspace_id, slug)` — slug unique within a workspace, not platform-wide (two workspaces may share a board slug without conflict).
- `workspace_id`
- `(workspace_id, display_order)` — ordered list queries
- `(workspace_id, is_archived)` — active board count checks

---

## Slug Rules

Slugs are **unique within a workspace** (not platform-wide — unlike workspace slugs).

```
- 2 to 50 characters
- Lowercase letters, numbers, hyphens only
- Cannot start or end with a hyphen
- Must be unique within the workspace
- Cannot be a reserved board slug (RESERVED_BOARD_SLUGS)
```

Auto-generation uses the same `slugify` + numeric-suffix logic as workspace slugs (`uniqueSlug()` appends `-1`, `-2`, … until unique), but scoped to the workspace.

---

## Validation Rules

| Field | Rules |
|---|---|
| `name` | Required, 2–50 chars |
| `slug` | Required, 2–50 chars, `[a-z0-9-]`, no leading/trailing hyphens, not in RESERVED_BOARD_SLUGS, unique within workspace |
| `description` | Optional, max 200 chars |
| `isPublic` | Boolean, default `true` |
| Board count | Active boards must be `< MAX_BOARDS_PER_WORKSPACE` (10) at time of creation |
| `boardIds` (reorder) | All IDs must belong to this workspace |

---

## Service Layer

> `canDelete` is computed in the service layer, not in the API route — keeps business logic out of the route handler.

### `lib/boards/queries.ts`

```ts
getBoardsForWorkspace(workspaceId, { includeArchived = false })
  → returns boards ordered by display_order ASC
  → if includeArchived = false: WHERE is_archived = false
  → includes post_count (subquery or joined count)

getBoardBySlug(workspaceId, boardSlug)
  → returns single board or null

getActiveBoardCount(workspaceId)
  → returns count of non-archived boards in this workspace
```

### `lib/boards/create.ts`

```ts
createBoard(workspaceId, createdBy, { name, slug?, description, isPublic })
  → validates: active board count < MAX_BOARDS_PER_WORKSPACE
  → generates slug if not provided: slugify(name) + uniqueness check within workspace
  → validates slug not reserved (RESERVED_BOARD_SLUGS)
  → validates slug unique within workspace
  → sets display_order = max(existing display_order) + 1
  → inserts board row
  → returns board
```

### `lib/boards/update.ts`

```ts
updateBoard(boardId, workspaceId, { name?, slug?, description?, isPublic? })
  → if slug changes: validate not reserved, validate unique within workspace
  → updates fields + updated_at
  → returns updated board

toggleArchive(boardId, workspaceId)
  → if archiving: always allowed
  → if unarchiving: check active board count < MAX_BOARDS_PER_WORKSPACE
  → flips is_archived value
  → returns updated board
```

### `lib/boards/delete.ts`

```ts
deleteBoard(boardId, workspaceId)
  → fetches board (verify belongs to workspace)
  → checks canDelete:
      canDelete = board.isArchived OR getActiveBoardCount(workspaceId) > 1
  → if !canDelete: throw "Cannot delete the only active board. Archive it first or create another board."
  → hard deletes board row (CASCADE removes all posts, votes, comments)
  → returns void
```

### `lib/boards/index.ts`

Re-exports all of the above.

---

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/workspaces/[slug]/boards` | Public / Member | List boards |
| POST | `/api/workspaces/[slug]/boards` | Brand Admin | Create board |
| GET | `/api/workspaces/[slug]/boards/[boardId]` | Public / Member | Get board |
| PATCH | `/api/workspaces/[slug]/boards/[boardId]` | Brand Admin | Update board |
| DELETE | `/api/workspaces/[slug]/boards/[boardId]` | Brand Admin | Delete board |
| PATCH | `/api/workspaces/[slug]/boards/[boardId]/archive` | Brand Admin | Toggle archive |
| PATCH | `/api/workspaces/[slug]/boards/reorder` | Brand Admin | Reorder boards |

> "Brand Admin" auth is enforced via the workspace-member/permission guard. Legacy `requireRole(['owner','admin'])` checks map to Brand Admin; `owner`/`admin` are stored values meaning Brand Admin, `member` means Team Member — see [`../DATABASE.md`](../DATABASE.md). Board management may be configured to permitted Team Members.

### `GET /api/workspaces/[slug]/boards` — List boards

```
Auth: requireWorkspaceMember (for private boards included) or public
Query params: includeArchived=true (Brand Admin only)
Returns: board[] ordered by display_order
  - Public request (no session): returns only is_public = true, is_archived = false boards
  - Workspace member request: returns all boards including private + archived
```

### `POST /api/workspaces/[slug]/boards` — Create board

```
Auth: requireRole(['owner', 'admin'])
Body: { name, slug?, description?, isPublic? }
Validates:
  - name: required, 2–50 chars
  - slug: optional, 2–50 chars, [a-z0-9-], not reserved, unique in workspace
  - Active board count < MAX_BOARDS_PER_WORKSPACE (returns 422 if at limit)
Returns: 201 + board
```

### `GET /api/workspaces/[slug]/boards/[boardId]` — Get board detail

```
Auth: Public (if is_public) or requireWorkspaceMember (if private)
Returns: board + post_count
```

### `PATCH /api/workspaces/[slug]/boards/[boardId]` — Update board

```
Auth: requireRole(['owner', 'admin'])
Body: { name?, slug?, description?, isPublic? }
Validates: slug rules if slug changes
Returns: updated board
```

### `DELETE /api/workspaces/[slug]/boards/[boardId]` — Delete board

```
Auth: requireRole(['owner', 'admin'])
Validates: canDelete logic (archived OR activeCount > 1)
Returns: 204
```

### `PATCH /api/workspaces/[slug]/boards/[boardId]/archive` — Toggle archive

```
Auth: requireRole(['owner', 'admin'])
Body: { archived: boolean }
Validates: if unarchiving, active count < MAX_BOARDS_PER_WORKSPACE
Returns: updated board
```

### `PATCH /api/workspaces/[slug]/boards/reorder` — Reorder boards

```
Auth: requireRole(['owner', 'admin'])
Body: { boardIds: string[] }  — ordered array of board IDs
Validates: all boardIds belong to this workspace
Logic: updates display_order for each board based on array index position
Returns: 200
```

> The reorder endpoint receives the full ordered array and bulk-updates all `display_order` values — simpler than swap logic.

---

## Routes & File Structure

```
app/
├── (workspace)/
│   └── [ws-slug]/
│       └── b/
│           └── [board-slug]/
│               ├── page.tsx                Admin board view (post list)
│               └── settings/
│                   └── page.tsx            Board settings
└── (public)/
│   └── [ws-slug]/
│       └── b/
│           └── [board-slug]/
│               └── page.tsx                Public board view
└── api/
    └── workspaces/
        └── [slug]/
            └── boards/
                ├── route.ts                GET list / POST create
                ├── reorder/
                │   └── route.ts            PATCH reorder
                └── [boardId]/
                    ├── route.ts            GET / PATCH / DELETE
                    └── archive/
                        └── route.ts        PATCH toggle archive
```

> The public board view and admin board view are **separate route groups** — `(public)` and `(workspace)` — intentionally, to allow different layouts, auth middleware, and metadata.

### `app/(workspace)/[ws-slug]/b/[board-slug]/page.tsx`

Admin board view:
- Server component
- Fetches board + posts (paginated, sorted by `vote_count DESC` by default)
- Shows board name, description, visibility badge, archived badge (if archived)
- Shows post list with `<PostCard />` components
- Shows "New Post" button (any logged-in user)
- Admin toolbar actions: Edit Board, Archive/Unarchive, Delete (from settings link)
- Shows "Archived" banner if board is archived
- Filter/sort controls: Trending / Newest / Top Voted / Status filter

### `app/(workspace)/[ws-slug]/b/[board-slug]/settings/page.tsx`

Board settings page:
- Server component
- Renders `<BoardSettingsForm />` pre-filled with current board data
- Separate "Danger Zone" section with Archive toggle + Delete button
- Delete triggers AlertDialog: "Type board name to confirm"
- Only accessible to Brand Admin (`owner`/`admin`)

### `app/(public)/[ws-slug]/b/[board-slug]/page.tsx`

Public board view:
- Server component (SEO-friendly)
- If board `is_public = false` and user is not a workspace member → 404 (not 403, to avoid leaking existence)
- If board `is_archived = true` → show "This board is no longer accepting submissions" banner, still shows existing posts
- Fetches posts sorted by `vote_count DESC` (default)
- Renders `<PostCard />` with `<VoteButton />` (Feature 06)
- Renders `<SubmitPostModal />` trigger button (Feature 05)
- SEO: `generateMetadata()` returns board name + workspace name in title

---

## Components

### `components/boards/create-board-modal.tsx`

- Client component — Dialog
- Fields:
  - Name (text input, required, 2–50 chars)
  - Slug (auto-generated from name, editable, with availability indicator)
  - Description (textarea, optional, max 200 chars)
  - Visibility toggle: Public / Private (default: Public)
- Submit → POST `/api/workspaces/[slug]/boards`
- On success: close modal, refresh board list, navigate to new board
- Shows warning if at `MAX_BOARDS_PER_WORKSPACE` limit (disables create button)

### `components/boards/board-card.tsx`

- Dashboard board card (name, post count, status)

### `components/boards/board-settings-form.tsx`

- Client component
- Same fields as create modal (name, slug, description, visibility)
- Slug change: live availability check with debounce
- Submit → PATCH `/api/workspaces/[slug]/boards/[boardId]`
- If slug changes: redirect to new board settings URL after save
- Separate archive/unarchive button (below form): "Archive Board" / "Unarchive Board"
  - Calls PATCH `/archive` endpoint
  - Unarchive blocked if workspace is at board limit
- Separate delete section:
  - "Delete Board" button → AlertDialog
  - User must type board name to confirm
  - Delete blocked if `canDelete = false` (shows reason)
  - On success: redirect to `/{ws-slug}`

### `components/boards/board-reorder-list.tsx`

- Client component — used inside `<WorkspaceNav />`
- Drag-and-drop list of active boards
- Uses HTML5 drag API or a lightweight DnD library (no heavy deps)
- On drop: PATCH `/api/workspaces/[slug]/boards/reorder` with new ordered array of IDs
- Optimistic update: reorder locally before server confirms
- Only rendered for Brand Admin (`owner`/`admin`)

---

## SEO

For public boards:
- `generateMetadata()` sets `<title>{boardName} — {workspaceName}</title>`
- `<meta name="description">` set to board description or fallback
- `og:title`, `og:description`, `og:url` set for social sharing
- `robots: index, follow` for public boards
- `robots: noindex, nofollow` for private boards (set in layout or page metadata)

---

## Technical Notes

- `display_order` is set to `MAX(display_order) + 1` on creation — gaps are fine, ordering by value is stable.
- The reorder endpoint receives the full ordered array and bulk-updates all `display_order` values — simpler than swap logic.
- Archived boards do **not** count toward `MAX_BOARDS_PER_WORKSPACE` — the limit applies to active (non-archived) boards only.
- `canDelete` is computed in the service layer, not in the API route — keeps business logic out of the route handler.
- The public board view and admin board view are **separate route groups** (`(public)` and `(workspace)`) — to allow different layouts, auth middleware, and metadata.
- `updated_at` must be manually set on every `UPDATE` — no DB trigger.
- Board slugs are scoped to workspace — two workspaces can have a board with the same slug without conflict.

### Edge-case handling

| Case | Handling |
|---|---|
| Create board when at limit (10 active) | API returns 422 — "Board limit reached. Archive or delete a board first." |
| Unarchive when at limit | API returns 422 — same message |
| Delete the only active board | `canDelete = false` (activeCount = 1 and not archived) — delete button disabled with tooltip |
| Slug collision within workspace on create | `uniqueSlug()` appends `-1`, `-2` until unique within workspace |
| Board slug changed — old URL still visited | 404 — no redirect (board slug is user-facing; document the change) |
| Public user visits private board URL | Returns 404 (not 403) — do not leak board existence |
| Public user visits archived board URL | Shows board with archived banner — posts readable, submission disabled |
| Two admins create board with same name simultaneously | DB `UNIQUE (workspace_id, slug)` catches race — second request gets 409 |
| Reorder payload contains unknown board IDs | API validates all IDs belong to workspace — returns 400 if any are foreign |
| Board deleted while user is viewing it | Next API call returns 404 — page shows "Board not found" |
</content>
</invoke>
