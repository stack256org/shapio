# Feature 12 — Workspace Settings & Moderation

> Product specification. For roles and permissions see [PLATFORM.md](../PLATFORM.md). For the technical reference (schema, delivery internals, integration points) see [implementation/features/12-workspace-settings-moderation.md](../implementation/features/12-workspace-settings-moderation.md).

## Overview

This feature brings every workspace-level configuration area together under one unified Settings experience. Each area is owned by the **Brand Admin** — the paying customer who owns the workspace — and is reached from a shared settings layout with a consistent sidebar.

It also introduces two capabilities not covered in earlier features:

- **Moderation** — control whether and how feedback and comments are reviewed before they go public, filter spam, and block disruptive users.
- **Audit Log** — a read-only history of every administrative action taken inside the workspace.

Settings areas introduced in earlier features (General from Feature 02, Members from Feature 03, Categories from Feature 08) are completed here and presented inside the same shared settings layout.

All Settings pages are **Brand Admin** pages. Team Members do not see Settings; a Team Member who reaches a settings URL is sent back to the workspace dashboard.

The split between configuring moderation and handling individual feedback is fixed:

- **Configuring moderation lives in Settings and is Brand Admin only.** This covers the approval mode, comment moderation, spam keyword rules, blocking and unblocking users, and the pending-approval queue.
- **Removing and triaging individual feedback and comments is a Team Member capability** — but it is done from the board and post views, never from the Settings pages. Every Team Member has this same fixed capability; there is no per-member configuration.

---

## Settings Sections

| Settings area | URL | Who manages it |
|---|---|---|
| **General** — name, slug, description, logo, roadmap & changelog visibility, delete workspace | `/{ws-slug}/settings/general` | Brand Admin |
| **Members** — invite, roles, remove, leave, transfer ownership | `/{ws-slug}/settings/members` | Brand Admin |
| **Categories** — create, edit, delete | `/{ws-slug}/settings/categories` | Brand Admin |
| **Moderation** — approval mode, comment moderation, spam filtering, blocked users, pending queue | `/{ws-slug}/settings/moderation` | Brand Admin |
| **Webhooks** — register endpoints to receive workspace events | `/{ws-slug}/settings/webhooks` | Brand Admin |
| **API Keys** — named keys for programmatic access to the workspace | `/{ws-slug}/settings/api-keys` | Brand Admin |
| **Embed** — configure and generate the embeddable feedback widget | `/{ws-slug}/settings/embed` | Brand Admin |
| **Audit Log** — read-only history of workspace actions | `/{ws-slug}/settings/audit-log` | Brand Admin |

The settings sidebar lists these areas in order and highlights the one currently open.

---

## General

General settings cover the workspace's identity and public-facing visibility.

**Workspace details**
- **Name** — the brand's display name.
- **Slug** — the workspace's URL identifier, checked for availability and reserved words as you type.
- **Description** — a short summary of the workspace.
- **Logo** — the brand's logo.

**Visibility**
- **Public Roadmap** — show or hide the roadmap at `/{ws-slug}/roadmap`. When public, anyone with the link can view planned and completed work.
- **Changelog** — show or hide the changelog at `/{ws-slug}/changelog`. When public, anyone with the link can read release notes.

**Delete workspace**
- The Brand Admin can permanently delete the workspace and all of its data. Deletion requires typing the workspace name to confirm.

---

## Moderation

Moderation lets the Brand Admin decide how much of the incoming feedback and discussion is reviewed before it becomes public, and gives them tools to keep the workspace healthy.

### Post approval mode

Each workspace runs in one of three approval modes:

- **Off** — posts appear immediately after submission. This is the default.
- **Automatic** — new posts are checked against the workspace's spam keyword list. Anything that matches is held for review; everything else appears immediately.
- **Manual** — every new post is held for the Brand Admin's approval before it becomes public.

Changing the mode only affects **new** submissions. Existing posts keep their current state, and switching modes never automatically approves a backlog.

### Comment moderation

A simple on/off setting. When on, comments are held until the Brand Admin approves them, rather than appearing immediately.

### Spam keyword filtering

The Brand Admin maintains a list of words and phrases (for example "casino", "free money", "click here"). When approval mode is **Automatic**, any new post containing one of these words is held for review instead of being published. A flagged post is never rejected outright — it simply waits in the pending queue, where it can be approved or deleted.

### Pending queue

When approval mode is **Manual**, or **Automatic** with flagged posts waiting, the moderation page shows a pending queue. Each entry shows the post title, author, submission date, and board. From here the Brand Admin can:

- **Approve** a post, making it public.
- **Delete** a post, removing it.

The queue shows a clear "no pending posts" state when empty.

### Blocking users

The Brand Admin can block a specific person from submitting posts or comments in the workspace by entering their email and an optional reason. A block applies whether or not that person has an account — a not-signed-in customer using the same email is blocked too. Blocked attempts to post or comment are refused.

The blocked users table lists each blocked person with their name/email, the reason, who blocked them, and when. The Brand Admin can unblock anyone from the table, after which that person can participate again.

Rules:
- A Brand Admin cannot block themselves.
- A Brand Admin cannot block the Brand Admin who owns the workspace.
- Blocking affects posting and commenting only — voting is not blocked.

---

## Webhooks

Webhooks let a Brand Admin connect the workspace to outside systems by registering endpoints that receive workspace events as they happen.

- Register one or more endpoints to receive events.
- Choose which events each endpoint should receive.
- Each endpoint keeps a **delivery log** showing recent attempts and their outcomes.
- An endpoint is **automatically disabled** after repeated consecutive delivery failures, and the Brand Admin is notified. The Brand Admin can re-enable it from settings.
- A **Test** action sends a sample event to the endpoint so the Brand Admin can confirm it is wired up correctly.

### Workspace events

Endpoints can subscribe to any of these events:

- Post created
- Post status changed
- Post merged
- Post deleted
- Comment created
- Vote cast
- Member joined
- Member removed
- Changelog published

---

## API Keys

API Keys give a Brand Admin programmatic access to the workspace's data.

- Generate a **named** key (for example "Zapier Integration").
- The full key is **shown once** at creation, with a copy-and-save prompt; it can never be retrieved again.
- The table shows each key's name and last-used time.
- A key can be **revoked** instantly.
- Every key is scoped to its own workspace and can only access that workspace's data.

---

## Embed

Embed lets a Brand Admin put the workspace's feedback board on their own site as a widget, without building anything custom.

- **Board** — which public board the widget displays. Required: the widget is a public, anonymous iframe onto a specific board's page, and there's no "all boards" route for it to fall back to.
- **Launcher** — choose whether the widget renders **inline** (embedded directly in the page) or as a **floating launcher** button that opens a panel.
- **Position** — for the floating launcher, which corner it anchors to (bottom right, bottom left, top right, top left).
- **Theme** — light, dark, or match the visitor's system.
- **Width** and **Height** — the widget's size. For inline embeds this is the initial size before it auto-resizes to fit content; for the floating launcher it's the panel's fixed size.
- **Accent color** — a brand color applied to the launcher button and to primary actions (like voting and "New post") inside the embedded content.

The page generates a ready-to-paste `<script>` snippet that reflects the current settings, with a one-click copy button. Pasting the snippet on any external site loads the widget — no sign-up or API key required on the visitor's end.

Changing a setting and saving doesn't update widgets already pasted onto external sites — the Brand Admin needs to copy the updated snippet and replace it where it's embedded.

---

## Audit Log

The Audit Log is a read-only history of administrative actions taken inside the workspace. It exists so a Brand Admin can see who did what, and when.

- It is **append-only** — it cannot be edited or cleared.
- It is visible to the **Brand Admin** only.
- It records actions such as: status changes, post merges/deletes/moves/pins/approvals, board create/archive/delete, member invite/role change/removal, ownership transfer, category create/edit/delete, workspace setting changes, moderation setting changes, blocking and unblocking users, comment deletions, and webhook and API key changes.
- Each entry shows the actor, a plain-language description of the action, the affected item, and a timestamp.
- The log is filterable by entity type (post, board, member, category, workspace, moderation) and by actor, with a simple date range (last 7 days / 30 days / all time).
- Entries are shown newest first and load in pages.

Example view:

```
Audit Log                                  [Filter: All ▾]  [Actor: All ▾]

2026-06-22 14:32   devang@…   changed status of "Dark mode" to Planned
2026-06-22 13:10   devang@…   merged "Dark Mode Support" into "Dark mode"
2026-06-21 09:45   team@…     removed member john@example.com
2026-06-20 18:22   devang@…   archived board "Old Feedback"
```

---

## User Flows

### Brand Admin enables manual post moderation

```
1. Open /{ws-slug}/settings/moderation
2. Set Post Approval Mode to "Manual"
3. Save
4. From now on, new posts are held for approval and appear in the pending queue
```

### Brand Admin reviews pending posts

```
1. A new post is submitted while moderation is "Manual"
2. The post is held and shown in the pending queue with a count badge
3. Brand Admin clicks "Approve" → the post becomes public
4. The pending count decreases
```

### Brand Admin adds spam keywords (Automatic mode)

```
1. Set approval mode to "Automatic"
2. Add keywords: "casino", "free money", "click here" → Save
3. A new post containing one of these words is held in the pending queue
4. Brand Admin can approve or delete it
```

### Brand Admin blocks a user

```
1. Open /{ws-slug}/settings/moderation
2. In the block form, enter the email and an optional reason → Block
3. The person appears in the blocked users table
4. Their next attempt to submit a post or comment is refused
```

### Brand Admin unblocks a user

```
1. Find the person in the blocked users table
2. Click "Unblock"
3. They are removed from the table and can participate again
```

### Brand Admin embeds the feedback widget on their site

```
1. Open /{ws-slug}/settings/embed
2. Choose Launcher (Inline or Floating), Position, Theme, Width, Height, Accent color
3. Copy the generated <script> snippet
4. Paste it into their own site's HTML
5. The widget appears, matching the configured appearance
```

### Brand Admin reviews the audit log

```
1. Open /{ws-slug}/settings/audit-log
2. Read the chronological list of administrative actions
3. Filter by entity type or actor to narrow it down
4. Load more entries as needed (the log is read-only)
```

---

## Product Rules

- All Settings areas are **Brand Admin** pages. Team Members and Users never reach them.
- Changing moderation mode affects only new submissions; it never retroactively changes existing posts or auto-approves the pending queue.
- A flagged or pending post is never auto-rejected — it always waits for a human decision.
- Blocking applies to posting and commenting, not voting, and works by email so it covers not-signed-in customers.
- A Brand Admin cannot block themselves or the Brand Admin who owns the workspace.
- API keys are shown once, are workspace-scoped, and can be revoked at any time.
- The audit log is read-only and cannot be cleared.
- A webhook endpoint that keeps failing is disabled automatically, and the Brand Admin is notified.
- The embed snippet reflects settings at copy time; saving new settings does not retroactively update snippets already pasted onto external sites.

---

## Edge Cases

| Case | Behaviour |
|---|---|
| A blocked person tries to vote | Allowed — blocking covers posting and commenting only. |
| Blocking an email that has no account | Allowed — the block applies to that email, so not-signed-in submissions are stopped too. |
| A blocked person's account is later deleted | The email-based block stays in effect. |
| A Brand Admin tries to block themselves | Refused. |
| A Brand Admin tries to block the Brand Admin who owns the workspace | Refused. |
| Two admins change moderation settings at the same time | The most recent save wins. |
| A spam keyword flags a legitimate post | The Brand Admin can approve it from the pending queue — it is held, not rejected. |
| Moderation mode switched from Manual to Off while posts are pending | Pending posts stay pending; the Brand Admin must approve or delete them. |
| Audit log grows very large | Shown in pages, newest first; performance is unaffected. |
| Embed settings changed after the snippet was already pasted elsewhere | The live site keeps the old appearance until the Brand Admin re-copies and re-pastes the updated snippet. |
| Position set on an inline (non-floating) embed | Ignored — position only affects the floating launcher. |
| Workspace has no public board | The Embed page shows an empty state instead of a snippet — there's nothing valid to embed yet. |

---

## Acceptance Criteria

**Settings layout**
- [ ] The settings sidebar appears on every settings page.
- [ ] The active area is highlighted.
- [ ] Settings are accessible to the Brand Admin only; Team Members are redirected to the workspace dashboard.

**General**
- [ ] Name, slug, and description are editable.
- [ ] Slug changes are validated for uniqueness and reserved words.
- [ ] Roadmap public/private toggle works.
- [ ] Changelog public/private toggle works.
- [ ] Delete workspace requires typing the workspace name to confirm.

**Moderation**
- [ ] Three approval modes are selectable (Off / Automatic / Manual).
- [ ] Comment moderation toggle works.
- [ ] Spam keyword editor supports adding and removing keywords.
- [ ] The pending queue appears when mode is Manual, or Automatic with flagged posts.
- [ ] A Brand Admin can approve and delete pending posts.
- [ ] The blocked users table shows name/email, reason, who blocked, and when.
- [ ] A Brand Admin can block a user by email with an optional reason.
- [ ] A Brand Admin can unblock a user.
- [ ] A blocked person is refused when submitting a post or comment.
- [ ] A Brand Admin cannot block themselves or the Brand Admin who owns the workspace.

**Webhooks**
- [ ] A Brand Admin can register endpoints and choose which events each receives.
- [ ] Each endpoint shows a delivery log.
- [ ] An endpoint is auto-disabled after repeated failures, with notification, and can be re-enabled.

**API Keys**
- [ ] A Brand Admin can generate a named key, shown once.
- [ ] The table shows each key's name and last-used time.
- [ ] A key can be revoked.

**Embed**
- [ ] A Brand Admin can choose Board, Launcher (Inline / Floating), Position, Theme, Width, Height, and Accent color.
- [ ] The generated `<script>` snippet updates live as settings change, before saving.
- [ ] The snippet can be copied with one click.
- [ ] Position is disabled/ignored when Launcher is Inline.
- [ ] Pasting the snippet on an external site renders the widget with the configured appearance.

**Audit Log**
- [ ] The audit log shows administrative actions newest first.
- [ ] The audit log is read-only.
- [ ] The audit log is filterable by entity type and actor.
- [ ] Entries load in pages.
- [ ] The audit log is accessible to the Brand Admin only.
