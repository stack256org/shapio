# Implementation — Feature 09: Public Roadmap

> Implementation reference for Feature 09 — Public Roadmap. Product behaviour: ../../features/09-public-roadmap.md

This document holds the technical detail removed from the product spec. Schema is owned by [`../DATABASE.md`](../DATABASE.md) — referenced here, not duplicated.

> **Implemented (Phase 2 — public portal).** The roadmap page now lives in the **public** route group at `app/(public)/[slug]/roadmap/page.tsx` (relocated from `(workspace)`):
> - Session is optional. When the workspace's roadmap is **private** (`roadmapPublic = false`) and the viewer is not a member, the page returns `notFound()` (it "appears not to exist"). Public roadmaps are readable by anyone.
> - `listPostsForRoadmap(workspaceId, { isAdmin, userId })` already excludes private/archived boards when `isAdmin` is false; `isAdmin` is true only for a member whose role is not `member`. Roadmap voting reuses the Phase 1 sign-in-required vote button.
> - Rendered under the shared `components/workspace/portal-header.tsx`.

> **Phase 5 note.** `listPostsForRoadmap` now also excludes merged posts (`isNull(posts.merged_into_id)`). The column mapping keys on the status slugs `planned`/`in_progress`/`completed`, which are immutable (a Brand Admin can rename a status's display name but not its slug), so the roadmap is robust to status renames.

---

## Dependencies

```
No new dependencies — reuses existing post queries, the vote button, and status
logic from Features 05, 06, and 08.
```

No new environment variables beyond Feature 01.

---

## Data / Queries

No new tables. Uses the existing `posts`, `boards`, `votes`, and `workspaces` tables defined in [`../DATABASE.md`](../DATABASE.md). The roadmap is purely derived from `posts.status` — there is no separate roadmap table, no manual ordering, and no separate publish step.

- `roadmap_public` is already a column on the `workspaces` table (added in Feature 02, default `true`) — no migration needed.

**Query shape:** `listPostsForRoadmap(workspaceId, { isAdmin, userId? })` lives in `lib/roadmap/queries.ts` (`lib/roadmap/index.ts` re-exports).

```ts
listPostsForRoadmap(workspaceId, {
  isAdmin = false,
  userId?,
})
  → fetches posts WHERE:
      workspace_id = workspaceId
      AND status IN ('planned', 'in_progress', 'completed')
      AND is_approved = true
      AND merged_into_id IS NULL
      AND (isAdmin ? true : boards.is_public = true)   -- exclude private board posts for public view
  → joined with boards (for board name + slug)
  → LEFT JOIN votes (for hasVoted flag if userId provided)
  → ordered per column: is_pinned DESC, vote_count DESC
  → returns grouped structure:
    {
      planned:     RoadmapPost[]
      in_progress: RoadmapPost[]
      completed:   RoadmapPost[]
    }

RoadmapPost:
  id, slug, title, voteCount, commentCount,
  boardName, boardSlug,
  isPinned, hasVoted,
  createdAt, updatedAt
```

- `listPostsForRoadmap` fetches all three columns in a single query (one `WHERE status IN (...)`) and groups in application code — avoids three separate DB round trips.
- Posts with `open`, `under_review`, or `closed` status do not appear.
- Only `is_approved = true` and `merged_into_id IS NULL` posts are returned.

---

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/workspaces/[slug]/roadmap` | Public (if `roadmap_public = true`) or `requireWorkspaceMember` | Get posts grouped by roadmap status |

### `app/api/workspaces/[slug]/roadmap/route.ts`

**GET** — Fetch roadmap posts

```
Query params:
  (none in MVP — all three columns returned in one response)

Logic:
  → fetch workspace by slug
  → if !workspace: 404
  → check roadmap visibility:
      if workspace.roadmap_public = false:
        → check session → if not member → 404
  → determine isAdmin from session + workspace_members
  → call listPostsForRoadmap(workspace.id, { isAdmin, userId: session?.user.id })

Returns:
  {
    planned:       RoadmapPost[]
    in_progress:   RoadmapPost[]
    completed:     RoadmapPost[]
    workspaceName: string
    workspaceSlug: string
  }
```

The only write action reachable from the roadmap is voting, handled by the Feature 06 vote endpoint (`POST /api/posts/[postId]/vote`).

---

## File Structure

```
app/
├── (public)/
│   └── [ws-slug]/
│       └── roadmap/
│           └── page.tsx                    Public roadmap page
├── (workspace)/
│   └── [ws-slug]/
│       └── roadmap/
│           └── page.tsx                    Team roadmap view (same data, private boards included)
└── api/
    └── workspaces/
        └── [slug]/
            └── roadmap/
                └── route.ts                GET roadmap posts (grouped by status)

components/
└── roadmap/
    ├── roadmap-board.tsx                   Three-column kanban layout
    ├── roadmap-column.tsx                  Single status column (header + post list)
    ├── roadmap-post-card.tsx               Post card variant for roadmap (compact)
    └── roadmap-empty-state.tsx             Empty column placeholder

lib/
└── roadmap/
    ├── queries.ts                          listPostsForRoadmap()
    └── index.ts
```

- The public roadmap page sits in the `(public)` route group — it does not use the workspace layout (sidebar, team nav). It has its own minimal public navbar (`<PublicNav />`) shared with the public board pages.

---

## Pages

### `app/(public)/[ws-slug]/roadmap/page.tsx`

Server component:

```
1. Fetch workspace by slug
2. If not found → 404
3. If workspace.roadmap_public = false:
     → check session
     → if not workspace member → 404 (not 403 — do not leak existence)
4. Call listPostsForRoadmap(workspace.id, { isAdmin: false, userId: session?.user.id })
5. Render <RoadmapBoard /> with grouped posts
6. generateMetadata(): title = "{workspaceName} Roadmap"
```

### `app/(workspace)/[ws-slug]/roadmap/page.tsx`

Team roadmap view (inside workspace layout):

```
Same as public view but:
  → isAdmin = true (shows posts from private boards too)
  → Shows a team-view indicator banner
  → Shows post count per column including private board posts
  → Links to the workspace board view (/{ws-slug}/b/{boardSlug}) not the public board
```

- Reuses the same `<RoadmapBoard />` component with an `isAdmin` prop that changes the post links (workspace board URL vs public URL) and includes private board posts.
- Always accessible to workspace members regardless of `roadmap_public`.

---

## Components

### `components/roadmap/roadmap-board.tsx`

Client component — top-level roadmap layout.

```
┌──────────────────────────────────────────────────────────┐
│  {WorkspaceName} Roadmap                                  │
│  "See what we're building"                                │
├──────────────────┬──────────────────┬────────────────────┤
│    PLANNED       │   IN PROGRESS    │     COMPLETED      │
│    {n} items     │    {n} items     │     {n} items      │
│                  │                  │                    │
│  ┌────────────┐  │  ┌────────────┐  │  ┌──────────────┐  │
│  │ Post card  │  │  │ Post card  │  │  │  Post card   │  │
│  └────────────┘  │  └────────────┘  │  └──────────────┘  │
│  ┌────────────┐  │                  │  ┌──────────────┐  │
│  │ Post card  │  │                  │  │  Post card   │  │
│  └────────────┘  │                  │  └──────────────┘  │
└──────────────────┴──────────────────┴────────────────────┘
```

**Props:**
```ts
{
  planned: RoadmapPost[]
  inProgress: RoadmapPost[]
  completed: RoadmapPost[]
  workspaceSlug: string
  boardSlugs: Record<string, string>   // boardId → boardSlug for link generation
}
```

**Responsive behaviour:**
- Desktop (≥1024px): three columns side by side
- Tablet (768–1023px): two columns (Planned + In Progress), Completed below
- Mobile (<768px): single column, stacked vertically with section headers

### `components/roadmap/roadmap-column.tsx`

```ts
Props:
{
  title: 'Planned' | 'In Progress' | 'Completed'
  posts: RoadmapPost[]
  workspaceSlug: string
  colourScheme: { header: string, badge: string }
}
```

**Renders:**
- Column header: status title + item count badge (colour matches status)
- List of `<RoadmapPostCard />` components
- If `posts.length = 0`: renders `<RoadmapEmptyState />`
- "Show more" button if `posts.length > 10` (loads next 10 inline — no page navigation)

**Column colour schemes:**
```
Planned:     header bg = blue-50,    badge = blue-600
In Progress: header bg = purple-50,  badge = purple-600
Completed:   header bg = green-50,   badge = green-600
```

### `components/roadmap/roadmap-post-card.tsx`

Compact post card variant for roadmap columns.

```
┌──────────────────────────────────────┐
│  ▲                                   │
│  42   Dark mode support              │  ← title links to post detail
│       ● UI/UX    💬 12               │  ← category chip + comment count
│       Feature Requests               │  ← board name (links to board)
└──────────────────────────────────────┘
```

**Props:**
```ts
{
  post: RoadmapPost
  workspaceSlug: string
  boardSlug: string
}
```

**Elements:**
- `<VoteButton />` (left, compact variant — shows count, handles optimistic update)
- Post title — links to `/{ws-slug}/b/{boardSlug}/p/{postId}-{slug}`
- Category chip (`<CategoryChip />`) — if category assigned
- Comment count with icon
- Board name — links to `/{ws-slug}/b/{boardSlug}` (public board URL)
- Pin indicator (pin icon) if `isPinned = true`

**Interactions:**
- Title click → navigate to post detail
- Vote button → same behaviour as on board page (Feature 06)
- Board name click → navigate to public board

### `components/roadmap/roadmap-empty-state.tsx`

Rendered inside an empty column:

```
Planned:     "Nothing planned yet. Submit ideas on the feedback board."
In Progress: "Nothing in progress right now."
Completed:   "Nothing shipped yet. Check back soon."
```

Each message includes a subtle illustration or icon. No CTA button (roadmap is read-only).

---

## Visibility Toggle

Controlled by `workspace.roadmap_public` (boolean, default `true`).

- **Settings location:** `/{ws-slug}/settings/general` — field already exists from Feature 02.
- When `false`: `/{ws-slug}/roadmap` returns 404 for non-members (no indication the roadmap exists); workspace members can still view via the session member check in the layout; the workspace team roadmap is always accessible.
- Toggling off issues `PATCH /api/workspaces/[slug] { roadmapPublic: false }` — no new API surface (field added in Feature 02).

---

## Navbar Integration

The workspace public navbar (shown on public board, roadmap, and changelog pages) includes a **Roadmap** link when `workspace.roadmap_public = true`:

```
{WorkspaceName}   Boards ▾   Roadmap   Changelog   [Sign In]
```

- Link target: `/{ws-slug}/roadmap`
- Hidden from the nav when `workspace.roadmap_public = false`
- Active state applied when on the roadmap page

---

## SEO

The public roadmap page is fully server-side rendered with `generateMetadata()`:

```ts
generateMetadata({ params }) {
  return {
    title: `${workspaceName} Roadmap`,
    description: `See what ${workspaceName} is building — planned features, work in progress, and recently shipped updates.`,
    openGraph: {
      title: `${workspaceName} Roadmap`,
      description: '...',
      url: `${APP_URL}/${wsSlug}/roadmap`,
    },
    robots: workspace.roadmap_public ? 'index, follow' : 'noindex, nofollow',
  }
}
```

- SSR + correct `robots` meta tag — indexable when public, blocked when private.

---

## Technical Notes

- The roadmap is purely derived from post statuses — no separate roadmap table, no manual drag-and-drop ordering, no separate publish step. Intentional for MVP simplicity.
- Vote counts on roadmap cards update optimistically via client state but do not re-sort the columns in real time — re-sort happens on full page reload. Acceptable UX for MVP.
- "Show more" within a column is a client-side expand (all posts already fetched in the initial server response) — not a new API call. Works because roadmap posts are typically fewer than 50 per column at MVP scale.
- Status changes that move a post into/out of roadmap statuses (via Feature 08) enqueue `SEND_STATUS_CHANGE_EMAIL` to all voters; columns reflect the move on the next roadmap fetch.
- Completed column: MVP has no archiving or truncation — shows most recent 10 with "Show more" for the rest. Post-MVP: filter by date range.

### Edge cases (implementation handling)

| Case | Handling |
|---|---|
| Workspace has no posts with roadmap statuses | All three columns show `<RoadmapEmptyState />` |
| Roadmap private + non-member visits | Returns 404 — no indication the roadmap exists |
| Roadmap private + member visits | Page renders normally (member check via session) |
| Post moved from public board to private board | `listPostsForRoadmap` with `isAdmin = false` excludes it — disappears from public roadmap |
| Pinned post | `is_pinned = true` posts shown first within their column |
| A column has 50+ posts | "Show more" loads next 10 inline — avoids infinitely tall columns on first load |
| Post status changed to `completed` | Moves to Completed column on next roadmap fetch |
| User votes on roadmap item | Optimistic count updates; sort order re-evaluates only on next full page load |
| Duplicate ws-slug | Workspace slugs are platform-unique (enforced in Feature 02) — no collision possible |
| Bot/crawler | SSR + correct robots meta tag — indexable when public, blocked when private |
