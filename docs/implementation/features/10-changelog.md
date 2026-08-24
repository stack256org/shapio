# Implementation — Feature 10: Changelog

> Implementation reference for Feature 10 — Changelog. Product behaviour: ../../features/10-changelog.md

This document holds the technical detail removed from the product spec. Schema is owned by [`../DATABASE.md`](../DATABASE.md) — referenced here, not duplicated.

---

## Dependencies

```
marked          — Markdown → HTML rendering (server-side, safe)
isomorphic-dompurify — sanitise rendered HTML (XSS prevention)
pg-boss         — enqueue SEND_CHANGELOG_EMAIL jobs
nodemailer      — deliver changelog emails
```

> `marked` + `isomorphic-dompurify` run **server-side only**, in the API/page layer. The client receives sanitised HTML — never raw markdown rendered directly.

No new environment variables beyond Feature 01.

---

## Database

Tables for this feature — `changelog_entries` and the `changelog_posts` join table — are defined in [`../DATABASE.md`](../DATABASE.md). Key points relevant to behaviour:

- `changelog_entries.body` stores **raw Markdown**.
- `changelog_entries.label` is one of `new_feature | improvement | bug_fix | security | deprecation` (default `new_feature`).
- `changelog_entries.is_published` defaults to `false`; `published_at` is set when first published.
- `changelog_entries.notified_at` is set after emails are enqueued and acts as the re-notify guard (see [Publish & Notify](#publish--notify)).
- `changelog_entries.created_by → user.id`; `workspace_id → workspaces.id` (CASCADE DELETE).
- `changelog_posts` has composite `PRIMARY KEY (changelog_entry_id, post_id)`, preventing duplicate links. Both foreign keys CASCADE DELETE.
- Linked posts must belong to the same workspace as the entry.

**Indexes** (see DATABASE.md for the authoritative list): `workspace_id`, `(workspace_id, is_published, published_at DESC)` — public changelog list, `created_by`, and `changelog_posts.post_id`.

### Label Reference

| Label | Slug | Badge Colour | Display Name |
|---|---|---|---|
| New Feature | `new_feature` | Indigo | New Feature |
| Improvement | `improvement` | Blue | Improvement |
| Bug Fix | `bug_fix` | Orange | Bug Fix |
| Security | `security` | Red | Security |
| Deprecation | `deprecation` | Yellow | Deprecation |

---

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/workspaces/[slug]/changelog` | Member | List entries (admin: all; public: published) |
| POST | `/api/workspaces/[slug]/changelog` | Brand Admin | Create entry (draft) |
| GET | `/api/workspaces/[slug]/changelog/[id]` | Member / Public | Get entry + linked posts |
| PATCH | `/api/workspaces/[slug]/changelog/[id]` | Brand Admin | Update entry |
| DELETE | `/api/workspaces/[slug]/changelog/[id]` | Brand Admin | Delete entry |
| POST | `/api/workspaces/[slug]/changelog/[id]/publish` | Brand Admin | Publish entry + notify voters |
| DELETE | `/api/workspaces/[slug]/changelog/[id]/publish` | Brand Admin | Unpublish (revert to draft) |

> "Brand Admin" is enforced internally via `requireRole(['owner','admin'])`; `owner`/`admin` are stored values that both mean Brand Admin, `member` means Team Member — see [`../DATABASE.md`](../DATABASE.md). Create/edit may be granted to a Team Member by the Brand Admin; publishing remains a Brand Admin action.

### `GET /api/workspaces/[slug]/changelog`

```
Auth: requireWorkspaceMember
Query: includeDrafts=true (always true for admin view), page, limit
Returns: { entries: ChangelogEntry[], total, hasMore }
  Each entry: id, title, label, isPublished, publishedAt, linkedPostCount, createdAt
```

### `POST /api/workspaces/[slug]/changelog`

```
Auth: requireRole(['owner', 'admin'])
Body: { title: string, body: string, label: ChangelogLabel, postIds?: string[] }
Validates:
  - title: required, 1–200 chars
  - body: required, min 1 char (empty string allowed for draft with no body yet)
  - label: must be valid enum value
  - postIds: all must belong to same workspace
Returns: 201 + entry
```

### `GET /api/workspaces/[slug]/changelog/[entryId]`

```
Auth: requireWorkspaceMember (admin) or public (if published + changelog_public)
Returns: entry + linked posts + rendered HTML body
```

### `PATCH /api/workspaces/[slug]/changelog/[entryId]`

```
Auth: requireRole(['owner', 'admin'])
Body: { title?, body?, label?, postIds? }
Returns: updated entry
```

### `DELETE /api/workspaces/[slug]/changelog/[entryId]`

```
Auth: requireRole(['owner', 'admin'])
Returns: 204
```

### `POST /api/workspaces/[slug]/changelog/[entryId]/publish`

```
Auth: requireRole(['owner', 'admin'])
Calls: publishEntry(entryId, workspaceId)
Returns: updated entry { is_published: true, published_at, notified_at }
```

### `DELETE /api/workspaces/[slug]/changelog/[entryId]/publish`

```
Auth: requireRole(['owner', 'admin'])
Calls: unpublishEntry(entryId, workspaceId)
Returns: updated entry { is_published: false }
```

### Validation Rules

| Field | Rules |
|---|---|
| `title` | Required, 1–200 chars |
| `body` | Required (can be empty string for draft), max 50,000 chars |
| `label` | Must be one of: `new_feature`, `improvement`, `bug_fix`, `security`, `deprecation` |
| `postIds` | Optional array; all IDs must belong to same workspace; max 20 items |

---

## Service Layer

`lib/changelog/` — `queries.ts`, `create.ts`, `update.ts`, `delete.ts`, `publish.ts`, `index.ts`.

### `queries.ts`

```ts
listEntries(workspaceId, { includeDrafts = false, page = 1, limit = 20 })
  → if includeDrafts = true: return all entries
  → if includeDrafts = false: WHERE is_published = true
  → ordered by published_at DESC (published), updated_at DESC (drafts at top for admin)
  → includes linked post count per entry
  → returns { entries: ChangelogEntry[], total, hasMore }

getEntryById(entryId, workspaceId)
  → returns entry with linked posts array
  → linked posts: { id, title, slug, boardSlug, voteCount, status }

getEntriesForPost(postId)
  → returns all published changelog entries linked to a post
  → used on post detail page to show "Shipped in: v2.1 release"
```

### `create.ts`

```ts
createEntry(workspaceId, createdBy, { title, body, label, postIds? })
  → validates: title 1–200 chars
  → validates: label is valid enum value
  → validates: postIds (if provided) all belong to same workspace
  → inserts changelog_entries row (is_published = false)
  → if postIds: inserts changelog_posts rows
  → returns entry
```

### `update.ts`

```ts
updateEntry(entryId, workspaceId, { title?, body?, label?, postIds? })
  → verifies entry belongs to workspace
  → updates entry fields + updated_at
  → if postIds provided:
      → DELETE FROM changelog_posts WHERE changelog_entry_id = entryId
      → INSERT new changelog_posts rows
      → (full replacement of linked posts list)
  → returns updated entry
```

> `changelog_posts` is fully replaced on every update (`DELETE` + `INSERT`) — simpler than diffing. Since entries rarely have more than 10 linked posts, this is efficient.

### `delete.ts`

```ts
deleteEntry(entryId, workspaceId)
  → verifies entry belongs to workspace
  → CASCADE: changelog_posts rows deleted automatically
  → DELETE FROM changelog_entries WHERE id = entryId
  → returns void
```

---

## Publish & Notify

### `publish.ts`

```ts
publishEntry(entryId, workspaceId)
  → fetch entry
  → if already published: return entry (idempotent)
  → UPDATE changelog_entries SET
      is_published = true,
      published_at = COALESCE(published_at, now())  -- preserve original publish date on re-publish
    WHERE id = entryId

  → if notified_at IS NULL:  -- only notify once, ever
      → fetch linked post IDs from changelog_posts
      → for each post:
          → fetch all voters (user_id + user_email)
          → for each voter with valid email:
              enqueue SEND_CHANGELOG_EMAIL job
      → UPDATE changelog_entries SET notified_at = now()

  → returns updated entry

unpublishEntry(entryId, workspaceId)
  → if not published: return entry (idempotent)
  → UPDATE changelog_entries SET is_published = false
  → does NOT clear published_at or notified_at
  → no emails sent
  → returns updated entry
```

### `notified_at` guard

The `notified_at` column prevents re-sending emails on re-publish:

```
First publish:
  → notified_at IS NULL → emails sent → notified_at = now()

Edit entry + re-publish:
  → notified_at IS NOT NULL → emails NOT re-sent

Unpublish + re-publish:
  → notified_at IS NOT NULL → emails NOT re-sent

New posts linked after first publish:
  → Voters of newly linked posts NOT notified (MVP limitation)
  → Post-MVP: track per-post notification status separately
```

`notified_at` is set **after jobs are enqueued, not after delivery**. If SMTP is down and all pg-boss retries exhaust, `notified_at` is already set — voters cannot be retried by re-publishing. Post-MVP fix: a "re-notify failed voters" action that resets `notified_at` after verifying delivery failure.

### Edge cases

| Case | Handling |
|---|---|
| Entry published with no linked posts | Published successfully — no emails sent |
| Entry published — linked post has 0 voters | No jobs enqueued for that post |
| Same post linked to two different entries | Both entries reference the post; voter receives separate emails for each entry |
| Entry re-published after edit | `notified_at IS NOT NULL` → no emails re-sent |
| Admin links new posts after initial publish | Voters of new posts NOT notified (MVP). `notified_at` already set |
| Markdown body contains XSS attempt (`<script>`) | `DOMPurify.sanitize()` strips dangerous HTML before serving |
| Body is very long (10,000 words) | Stored as `text` — no DB limit. Post-MVP: paginate or truncate |
| Post linked to entry is deleted | `CASCADE DELETE` on `changelog_posts.post_id` — link removed automatically; entry unaffected |
| Entry deleted while voter email is in-flight | pg-boss job runs; entry not found → handler logs warning, skips gracefully (no crash) |
| Two admins publish same entry simultaneously | `publishEntry` is idempotent — second call sees `is_published = true` → returns early, no duplicate emails |

---

## RSS Feed

`app/(public)/[ws-slug]/changelog/feed.xml/route.ts` — a Route Handler (not a page) returning raw XML.

```
Auth: Public (if changelog_public = true; 404 otherwise)

Returns: RSS 2.0 XML
Content-Type: application/rss+xml; charset=utf-8
Cache-Control: public, max-age=3600 (1 hour cache)

Feed structure:
  <channel>
    <title>{workspaceName} Changelog</title>
    <link>{APP_URL}/{wsSlug}/changelog</link>
    <description>Product updates and release notes for {workspaceName}</description>
    <lastBuildDate>{most recent published_at}</lastBuildDate>

    <item> per published entry:
      <title>{entry.title}</title>
      <link>{APP_URL}/{wsSlug}/changelog/{entryId}</link>
      <description>{plaintext body truncated to 500 chars}</description>
      <pubDate>{published_at in RFC 2822 format}</pubDate>
      <guid>{APP_URL}/{wsSlug}/changelog/{entryId}</guid>
      <category>{label display name}</category>
    </item>
  </channel>
```

Includes published entries only. Next.js route handlers support the custom response headers used here.

---

## Markdown Rendering

Body is stored as raw Markdown and rendered to HTML server-side:

```ts
import { marked } from "marked"
import DOMPurify from "isomorphic-dompurify"

export function renderMarkdown(markdown: string): string {
  const html = marked(markdown, {
    breaks: true,     // newlines → <br>
    gfm: true,        // GitHub-flavoured Markdown
  })
  return DOMPurify.sanitize(html as string)
}
```

**Allowed Markdown in MVP:** headings (##, ###), bold, italic, bullet/numbered lists, code blocks (inline + fenced), links, blockquotes, horizontal rules.

**Not supported in MVP:** images (no file upload), tables (complex rendering), HTML embeds.

`marked` + `isomorphic-dompurify` run on the **server only** — the public page and entry detail page render HTML server-side and send it to the client. This prevents client-side XSS and removes the need for a client-side Markdown library (a `marked` preview in the editor runs client-side for the Preview tab only).

---

## Components

### File structure

```
app/
├── (workspace)/
│   └── [ws-slug]/
│       └── changelog/
│           ├── page.tsx                    Admin changelog list (drafts + published)
│           ├── new/
│           │   └── page.tsx                Create new entry
│           └── [entryId]/
│               └── edit/
│                   └── page.tsx            Edit existing entry
├── (public)/
│   └── [ws-slug]/
│       └── changelog/
│           ├── page.tsx                    Public changelog feed
│           ├── [entryId]/
│           │   └── page.tsx                Single changelog entry detail
│           └── feed.xml/
│               └── route.ts               RSS feed
└── api/
    └── workspaces/
        └── [slug]/
            └── changelog/
                ├── route.ts                GET list / POST create
                └── [entryId]/
                    ├── route.ts            GET / PATCH / DELETE
                    └── publish/
                        └── route.ts        POST publish / DELETE unpublish

components/
└── changelog/
    ├── changelog-entry-card.tsx            Entry card for public feed list
    ├── changelog-entry-detail.tsx          Full entry (title, label, body, linked posts)
    ├── changelog-editor.tsx                Admin create/edit form
    ├── changelog-label-badge.tsx           Coloured label pill
    ├── linked-posts-selector.tsx           Search + select posts to link to entry
    ├── changelog-admin-card.tsx            Admin list card (draft/published state + actions)
    └── changelog-rss-link.tsx              RSS subscribe button/link in navbar

lib/
└── changelog/
    ├── queries.ts
    ├── create.ts
    ├── update.ts
    ├── delete.ts
    ├── publish.ts
    └── index.ts

lib/worker/handlers/
└── send-changelog-email.ts

lib/email/templates/
└── changelog.ts
```

### Pages

- **`app/(workspace)/[ws-slug]/changelog/page.tsx`** — Admin list. Server component. Fetches all entries via `listEntries(..., { includeDrafts: true })`, renders `<ChangelogAdminCard />` per entry. Drafts at top with "Draft" badge. "New Entry" button → `/[ws-slug]/changelog/new`. Published entries show publish date, linked post count, voter notification status.
- **`app/(workspace)/[ws-slug]/changelog/new/page.tsx`** — Renders `<ChangelogEditor />` in create mode. On success: redirect to `/{ws-slug}/changelog`.
- **`app/(workspace)/[ws-slug]/changelog/[entryId]/edit/page.tsx`** — Fetches entry by ID (404 if not found). Renders `<ChangelogEditor />` in edit mode pre-filled. On success: redirect to `/{ws-slug}/changelog`.
- **`app/(public)/[ws-slug]/changelog/page.tsx`** — Public feed. Server component. Checks `workspace.changelog_public` — if false → 404 for non-members. Fetches published entries only. Renders `<ChangelogEntryCard />` per entry + `<ChangelogRssLink />` in header. SEO: `generateMetadata()` with workspace name + "Changelog"; `robots: index` if public, `noindex` if private. Uses the same minimal public navbar as boards and roadmap.
- **`app/(public)/[ws-slug]/changelog/[entryId]/page.tsx`** — Single entry detail. Server component. Fetches entry by ID — 404 if not found or not published. Renders `<ChangelogEntryDetail />`: title, label badge, published date, server-rendered Markdown body, linked posts with status badges + vote counts. SEO via `generateMetadata()` with entry title. Back link → `/{ws-slug}/changelog`.

### `changelog-editor.tsx`

Client component — full create/edit form.

```
┌─────────────────────────────────────────┐
│ Title                                   │
│ [________________________________]      │
│                                         │
│ Label                                   │
│ [New Feature ▾]                         │
│                                         │
│ Body (Markdown)                         │
│ ┌─────────────────────────────────────┐ │
│ │  Markdown editor (textarea)         │ │
│ └─────────────────────────────────────┘ │
│ [Preview] tab switches to rendered view │
│                                         │
│ Linked Posts (optional)                 │
│ [Search posts...]  + <LinkedPost chips> │
│                                         │
│ [Save Draft]         [Publish ▸]        │
└─────────────────────────────────────────┘
```

**Fields:** Title (required, 1–200 chars, live char count); Label select (5 options with colour preview); Body textarea (Markdown, monospace); Preview tab (client-side `marked` preview); Linked posts via `<LinkedPostsSelector />`.

**Actions:** "Save Draft" → POST/PATCH without publishing; "Publish" → POST/PATCH then POST to `/publish`; if already published: "Update" → PATCH, "Unpublish" → DELETE `/publish`.

**Auto-save:** Debounced auto-save to draft every 30 seconds using `useEffect` + `debounce` — fires PATCH (if entry exists) or POST (if new, creates the draft). Entry ID returned from POST is stored in component state for subsequent PATCHes. Shows "Saved" / "Saving…" indicator.

### `linked-posts-selector.tsx`

Client component. Search input: debounced GET `/api/workspaces/[slug]/boards/*/posts?search=xxx`. Shows matching posts as selectable items (title + status badge + vote count). Selected posts shown as chips with × to remove. Max 20 linked posts per entry (soft limit).

### `changelog-entry-card.tsx`

Public feed card: label badge, date, title (links to detail), body truncated to ~200 chars, linked post titles ("Linked: Dark mode support (+2 more)").

### `changelog-admin-card.tsx`

Admin list card — same as public card plus: "Draft" badge (if not published), "Voters notified" badge (if `notified_at IS NOT NULL`), Edit button → `/{ws-slug}/changelog/[entryId]/edit`, Publish/Unpublish toggle, Delete button (AlertDialog confirm).

### `changelog-entry-detail.tsx`

Full public entry view: title, `<ChangelogLabelBadge />` + published date, server-rendered HTML body, "Linked feedback" section (`[StatusBadge] {title}` → post detail, with vote counts), back to changelog link.

### Navbar integration

Public navbar for changelog pages:

```
{WorkspaceName}   Boards ▾   Roadmap   Changelog   [Sign In]
```

- "Changelog" link → `/{ws-slug}/changelog`; hidden if `workspace.changelog_public = false`.
- Active state on changelog pages.
- RSS icon (`<ChangelogRssLink />`) shown in the changelog page header.

---

## Background Jobs

### `SEND_CHANGELOG_EMAIL`

See [`../JOBS.md`](../JOBS.md) for the job registry.

**Trigger:** `publishEntry()` when `notified_at IS NULL` — enqueued once per voter per entry.

**Payload:**
```ts
{
  voterEmail: string
  voterName: string
  entryTitle: string
  entryLabel: string            // display name e.g. "New Feature"
  entryUrl: string              // /{ws-slug}/changelog/{entryId}
  entryBodyPreview: string      // first 300 chars of body (plain text, not HTML)
  linkedPostTitle: string       // title of the post they voted on
  workspaceName: string
}
```

**Handler:** `lib/worker/handlers/send-changelog-email.ts`
- Subject: `"[{workspaceName}] {entryLabel}: {entryTitle}"`
- Body: greeting "A feature you voted for has shipped!"; linked post title; entry title + label badge; body preview; "Read the full update →" link; "You're receiving this because you voted on '{postTitle}'."

**Volume note:** A post with 200 voters linked to an entry → 200 jobs enqueued. pg-boss processes these with configurable concurrency to respect SMTP rate limits.

---

## Technical Notes

- `marked` + `isomorphic-dompurify` run on the **server only** for the public-facing render; the editor Preview tab uses a client-side `marked` render of unsaved body text.
- `notified_at` is set after jobs are enqueued, not after delivery (see [Publish & Notify](#publish--notify) for the known limitation).
- `changelog_posts` is fully replaced on every update (`DELETE` + `INSERT`) rather than diffed.
- The RSS feed is a Route Handler (`route.ts`), not a page — it returns raw XML with `Content-Type: application/rss+xml`.
- `published_at` is set with `COALESCE(published_at, now())` to preserve the original publish date across unpublish/re-publish, keeping feed order stable.
- The public changelog page lives in the `(public)` route group and uses the same minimal public navbar as boards and roadmap.
- `changelog_public` is already on the `workspaces` table from Feature 02 — no migration needed. See [`../DATABASE.md`](../DATABASE.md).
</content>
</invoke>
