# Feature 02 — Workspaces (Implementation Reference)

> Implementation reference for Feature 02 — Workspaces. Product behaviour: [../../features/02-workspaces.md](../../features/02-workspaces.md)

This file captures the technical detail removed from the product spec: API endpoints, service layer, components, background jobs, and engineering notes. For the full database schema see [../DATABASE.md](../DATABASE.md).

---

## Dependencies

| Library | Purpose |
|---|---|
| `@paralleldrive/cuid2` | Generate collision-resistant IDs |
| `slugify` | Auto-generate slug from workspace name |
| `pg-boss` | Enqueue the `SEND_WORKSPACE_DELETED_EMAIL` job |
| `nodemailer` | Deliver the deletion email |

Auth is provided by Better Auth (see [Feature 01](../../features/01-authentication.md)) and the shared tech stack in [../TECH-STACK.md](../TECH-STACK.md).

---

## Environment Variables

No new environment variables beyond Feature 01. Uses:

```env
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / EMAIL_FROM
```

---

## Database Schema

The `workspaces` table is defined in `db/schema/workspaces.ts`. See [../DATABASE.md](../DATABASE.md) for the full schema and role mapping. Summary of workspace-owned columns:

```ts
import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core"
import { user } from "./auth"

export const workspaces = pgTable("workspaces", {
  id:                 text("id").primaryKey(),
  slug:               text("slug").notNull().unique(),
  name:               text("name").notNull(),
  description:        text("description"),
  logoUrl:            text("logo_url"),
  ownerId:            text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  roadmapPublic:      boolean("roadmap_public").notNull().default(true),
  changelogPublic:    boolean("changelog_public").notNull().default(true),
  moderationMode:     text("moderation_mode").notNull().default("off"),    // 'off' | 'auto' | 'manual'
  commentModeration:  boolean("comment_moderation").notNull().default(false),
  spamKeywords:       text("spam_keywords").array().notNull().default([]),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
})
```

**Indexes:** `UNIQUE` on `slug`; index on `owner_id`.

> Internally, workspace membership stores roles `owner` / `admin` (→ **Brand Admin**) and `member` (→ **Team Member**). These are storage values only — see [../DATABASE.md](../DATABASE.md) and [../../PLATFORM.md](../../PLATFORM.md).

---

## File Structure

```
app/
├── onboarding/
│   └── page.tsx                        Create first workspace (server + client)
├── post-auth/
│   └── page.tsx                        Redirect to workspace or onboarding
├── (workspace)/
│   └── [ws-slug]/
│       ├── layout.tsx                  Workspace layout — sidebar, nav, switcher
│       ├── page.tsx                    Workspace dashboard (boards overview)
│       └── settings/
│           └── general/
│               └── page.tsx            Edit workspace / delete workspace
└── api/
    └── workspaces/
        ├── route.ts                    GET (list mine) / POST (create)
        └── [slug]/
            └── route.ts                GET (single) / PATCH (update) / DELETE

components/
├── workspace/
│   ├── workspace-switcher.tsx          Dropdown: list workspaces + create new
│   ├── workspace-nav.tsx               Sidebar navigation for a workspace
│   ├── create-workspace-form.tsx       Onboarding form (name → auto-slug)
│   └── workspace-settings-form.tsx     Edit name / slug / description / logo
└── layout/
    └── navbar.tsx                      Top bar with switcher + user menu

lib/
└── workspaces/
    ├── workspace.ts                    CRUD service functions
    └── index.ts                        Re-exports

db/schema/
└── workspaces.ts                       Drizzle table definition

lib/worker/handlers/
└── send-workspace-deleted-email.ts     pg-boss job handler
```

---

## Service Layer

`lib/workspaces/workspace.ts`:

```ts
createWorkspace({ name, ownerId })
  → generates cuid2 id
  → generates unique slug from name (slugify + collision check)
  → inserts workspace row
  → inserts workspace_members row (role: 'owner')
  → inserts default board ("Feature Requests", slug: "feature-requests")
  → returns workspace

getWorkspaceBySlug(slug)
  → returns workspace or null

getWorkspacesForUser(userId)
  → returns all workspaces where user is a member (via workspace_members join)

updateWorkspace(id, { name?, slug?, description?, logoUrl? })
  → if slug changes: check slug not taken, check not reserved
  → updates workspace row
  → returns updated workspace

deleteWorkspace(id, requesterId)
  → verifies requester is the owner
  → fetches all workspace member emails (for notification)
  → hard deletes workspace (CASCADE removes all child data)
  → enqueues SEND_WORKSPACE_DELETED_EMAIL job with member emails + workspace name
```

### Auto-slug generation

```ts
import slugify from "slugify"

function generateSlug(name: string): string {
  return slugify(name, { lower: true, strict: true, trim: true })
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = generateSlug(base)
  let suffix = 0
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`
    const exists = await db.query.workspaces.findFirst({
      where: eq(workspaces.slug, candidate),
    })
    if (!exists) return candidate
    suffix++
  }
}
```

### Reserved slugs

Defined in `config/platform.ts`:

```ts
export const RESERVED_WORKSPACE_SLUGS = [
  "api", "admin", "orbit", "signin", "signup", "onboarding",
  "dashboard", "settings", "invite", "post-auth", "docs",
  "changelog", "roadmap", "public", "static", "assets",
  "www", "mail", "help", "support", "status",
]
```

---

## API Endpoints

### `app/api/workspaces/route.ts`

**GET** — List workspaces for the signed-in user
```
Auth: requireSession
Returns: workspace[] (id, slug, name, logoUrl, role)
```

**POST** — Create a new workspace
```
Auth: requireSession
Body: { name: string }
Validates: name required, 2–50 chars
Calls: createWorkspace({ name, ownerId: session.user.id })
Returns: 201 + workspace
```

### `app/api/workspaces/[slug]/route.ts`

**GET** — Get single workspace
```
Auth: requireWorkspaceMember(slug)
Returns: workspace + member role
```

**PATCH** — Update workspace
```
Auth: requireRole(['owner', 'admin'])
Body: { name?, slug?, description?, logoUrl? }
Validates:
  - name: 2–50 chars
  - slug: 2–50 chars, lowercase, alphanumeric + hyphens only, not reserved
  - slug unique platform-wide
Returns: updated workspace
```

**DELETE** — Delete workspace
```
Auth: requireRole(['owner'])
Calls: deleteWorkspace(workspace.id, session.user.id)
Returns: 204
```

### API reference table

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/workspaces` | Session | List all workspaces for current user |
| POST | `/api/workspaces` | Session | Create a new workspace |
| GET | `/api/workspaces/[slug]` | Member | Get workspace details |
| PATCH | `/api/workspaces/[slug]` | owner/admin | Update workspace name/slug/description/logo |
| DELETE | `/api/workspaces/[slug]` | owner | Delete workspace + all data |
| GET | `/api/workspaces/check-slug` | Session | Check if slug is available (query param: `?slug=`) |

### Validation rules

| Field | Rules |
|---|---|
| `name` | Required, 2–50 chars, any characters allowed |
| `slug` | Required, 2–50 chars, `[a-z0-9-]` only, no leading/trailing hyphens, not reserved, platform-unique |
| `description` | Optional, max 300 chars |
| `logoUrl` | Optional, must be a valid URL (logo upload is post-MVP — accept URL string for now) |

---

## Components

### `app/onboarding/page.tsx`
- Server component wrapper, client form inside
- Checks session (redirect `/signin` if not signed in)
- Checks if user already has a workspace (redirect `/{ws-slug}` if yes)
- Renders `<CreateWorkspaceForm />`
- On success: redirect to `/{new-ws-slug}?welcome=1`

### `app/(workspace)/[ws-slug]/layout.tsx`
- Server component
- Calls `getWorkspaceBySlug(params['ws-slug'])`; 404 if not found
- Checks session → if not signed in redirect `/signin`
- Checks user is a member of this workspace → if not redirect `/signin`
- Passes workspace + member role as props to children via Context or props
- Renders `<WorkspaceNav />` (sidebar) + `<Navbar />` (top bar) + `{children}`

### `app/(workspace)/[ws-slug]/page.tsx`
- Workspace dashboard
- Lists all boards in this workspace (name, post count, visibility)
- Shows welcome banner if `?welcome=1` query param is present (client component, localStorage dismiss)
- Quick actions: create board, invite member
- If no boards (beyond default): prompt to create first board

### `app/(workspace)/[ws-slug]/settings/general/page.tsx`
- Renders `<WorkspaceSettingsForm />` pre-filled with current workspace data
- Separate "Danger Zone" section with delete workspace button
- Delete triggers AlertDialog: type workspace name to confirm → calls DELETE `/api/workspaces/[slug]`
- On delete success: redirect `/post-auth` (which detects remaining workspaces and routes accordingly)

### `components/workspace/create-workspace-form.tsx`
- Client component; field: `name` (text input)
- Auto-generates slug preview as user types (slugify, debounced); slug field is editable
- Slug availability check: debounced GET `/api/workspaces/check-slug?slug=xxx`
- Submit: POST `/api/workspaces`; on success `router.push('/${slug}?welcome=1')`

### `components/workspace/workspace-switcher.tsx`
- Client component — dropdown menu in the sidebar header
- Shows current workspace name + logo avatar
- Lists all workspaces the user belongs to with role badge
- "Create workspace" option at the bottom → navigates to `/onboarding`
- Clicking a workspace navigates to `/{ws-slug}`
- Fetch workspace list from `/api/workspaces` on mount

### `components/workspace/workspace-nav.tsx`
- Client component (active state for current route)
- Sidebar nav items:
  - Dashboard (`/{ws-slug}`)
  - Boards list (each board as nav item, collapsible)
  - All Posts (`/{ws-slug}/posts`) — Brand Admin / Team Member only
  - Roadmap (`/{ws-slug}/roadmap`) — admin view link
  - Changelog (`/{ws-slug}/changelog`) — workspace members only
  - Notifications (`/{ws-slug}/notifications`)
  - Settings (`/{ws-slug}/settings/general`) — Brand Admin only
- "New Board" button at bottom of boards list (Brand Admin only)

---

## Background Jobs

### `SEND_WORKSPACE_DELETED_EMAIL`

**Trigger:** When a workspace is deleted (inside `deleteWorkspace()` after successful DB delete).

**Payload:**
```ts
{
  workspaceName: string
  ownerName: string
  memberEmails: string[]
}
```

**Handler:** `lib/worker/handlers/send-workspace-deleted-email.ts`
- Loops over `memberEmails`
- Sends one email per member via Nodemailer
- Subject: `"[IdeaRoads] {workspaceName} has been deleted"`
- Body: workspace name, owner name, note that all data has been removed

See [../JOBS.md](../JOBS.md) for the full job catalogue.

---

## Technical Notes

- `pg_advisory_xact_lock(hashtext(workspaceId)::bigint)` inside `db.transaction()` for member mutations (prevents race conditions on concurrent role changes — added in Feature 03).
- Workspace deletion uses PostgreSQL `CASCADE` — no manual child deletion; child tables (`boards`, `posts`, `votes`, `workspace_members`, etc.) all have `ON DELETE CASCADE` FK to `workspaces.id`.
- `updated_at` is not auto-updated by triggers — the service layer must set it on every `UPDATE`.
- Logo upload is stubbed for MVP — `logoUrl` accepts a URL string; S3/R2 upload to be added post-MVP.
- Workspace context (workspace object + member role) is fetched once in the layout server component and passed down — do not re-fetch in every child page.
- `RESERVED_WORKSPACE_SLUGS` lives in `config/platform.ts` — add new reserved words there as new routes are added.

### Slug rules (enforced in service + API validation)

```
- 2 to 50 characters
- Lowercase letters, numbers, hyphens only
- Cannot start or end with a hyphen
- Must be unique platform-wide
- Cannot be a reserved slug
```

### Technical edge cases

| Case | Handling |
|---|---|
| User visits `/{ws-slug}` of a workspace they are not a member of | Layout returns 403 — redirect to their own workspace or `/signin` |
| Slug collision on auto-generate | `uniqueSlug()` appends `-1`, `-2`, etc. until unique |
| User changes slug then navigates to old slug URL | Old slug 404s — no redirect; user must use the new slug |
| Last workspace deleted | post-auth detects no workspaces → redirect `/onboarding` |
| Two users create a workspace with the same name simultaneously | Slug uniqueness enforced at DB level with `UNIQUE` constraint — second insert fails, server returns 409, client shows "Slug taken, try another name" |
| Workspace name with special characters (e.g. "Acme & Co!") | Slugify strips special chars → `acme-co`; user can override slug manually |
