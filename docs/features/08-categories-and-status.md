# Feature 08 — Categories & Status

> Product behaviour only. For technical detail (database, service layer, API, jobs) see [`../implementation/features/08-categories-and-status.md`](../implementation/features/08-categories-and-status.md).

## Overview

This feature covers two complementary tools for organising feedback:

**Categories** are workspace-defined labels — each with a name and a colour — used to classify feedback by topic (e.g. "UI/UX", "Performance", "Integrations"). A workspace defines its own categories; they are never shared across workspaces.

**Status** is the lifecycle state of a piece of feedback, from newly submitted all the way through to completed or closed. Status drives the [Public Roadmap](09-public-roadmap.md) and notifies the people who voted whenever it changes.

These are two different kinds of work:

- **Defining** categories and the status set is **structural** — it shapes how a workspace organises feedback. This is a [Brand Admin](../PLATFORM.md#2-product-roles) responsibility only.
- **Applying** a category to a post and **changing** a post's status are day-to-day **triage** actions, available to the team — Brand Admin and Team Member alike.

---

## Categories

A category is a workspace-defined label with a colour, used to classify feedback by topic.

- Categories are scoped to a workspace.
- A piece of feedback can have **zero or one** category.
- A category can be chosen when feedback is submitted, or applied later during triage.
- A category appears as a coloured **chip** on the feedback card and the feedback detail page.
- There is no limit on the number of categories per workspace.

**Who does what**

- A **Brand Admin** creates, edits, and deletes categories (structural). Only a Brand Admin can do this; Team Members cannot.
- The **team** (Brand Admin and Team Members) applies or changes the category on a post as part of triage.
- A **User** may optionally pick a category when submitting feedback.
- **Anyone** viewing a board may filter by category.

**Deleting a category** does not delete the feedback that used it — those posts simply lose the label. The delete confirmation shows how many posts currently use the category so the action's impact is clear.

Categories are managed at the clean URL `/{ws-slug}/settings/categories`.

---

## Status

Every piece of feedback moves through a defined set of workflow states. IdeaRoads ships with six statuses:

| Status | Meaning | Roadmap |
|---|---|---|
| **Open** | Newly submitted, no action yet | Not shown |
| **Under Review** | Being evaluated by the team | Not shown |
| **Planned** | Committed to building | **Planned** column |
| **In Progress** | Actively being built | **In Progress** column |
| **Completed** | Shipped | **Completed** column |
| **Closed** | Won't fix / not planned | Not shown |

- Every piece of feedback starts as **Open** when it is created.
- A **status badge** appears on the feedback card and the feedback detail page.
- Boards can be filtered by status.

**Status drives the roadmap.** Three statuses map to the public [Roadmap](09-public-roadmap.md) columns: **Planned**, **In Progress**, and **Completed**. Feedback that is Open, Under Review, or Closed does not appear on the public roadmap.

**Status history.** Each status change is recorded as a permanent, append-only history: what it changed from and to, who changed it, when, and an optional note. The status-history timeline is shown on the feedback detail page to **everyone** viewing the post (each transition and its date). The **actor** — who made each change — is shown only to the team (Brand Admins and Team Members); the public sees the transitions and dates without the actor's name.

**Notifications.** When the status of a piece of feedback changes, everyone who voted on it is notified so they can follow its progress. Setting a status to the value it already has is treated as no change — no history entry, no notifications. Feedback with no voters generates no notifications.

**Who does what**

- A **Brand Admin** defines and edits the status set (structural). Only a Brand Admin can do this; Team Members cannot.
- The **team** (Brand Admin and Team Members) changes a post's status as part of triage, optionally adding a note.
- **Anyone** viewing a board may filter by status.

A status of **Completed** does not automatically create a changelog entry; releases are announced manually via the [Changelog](10-changelog.md).

---

## Filtering

On any board, category and status are available as filters. They can be combined — selecting both a status and a category narrows the list to feedback that matches **both** (AND logic). The category filter is shown only when the workspace has at least one category. The visible feedback count updates as filters change.

---

## User Flows

### Brand Admin creates a category

```
1. Open /{ws-slug}/settings/categories
2. Choose "New Category"
3. Enter a name (e.g. "Performance") and pick a colour (e.g. Orange)
4. Save → the category appears in the list (0 posts)
5. The category is now available in the board filter and the submit form
```

### The team applies a category to a post

```
1. Open a piece of feedback
2. Choose a category (e.g. "Performance")
3. The card now shows the orange "Performance" chip
4. The post appears when the board is filtered by "Performance"
```

### A User submits feedback with a category

```
1. Open the submit form on a public board
2. Optionally pick a category (e.g. "UI/UX")
3. Submit → the feedback shows the category chip immediately
```

### A Brand Admin deletes a category

```
1. Open the categories settings page
2. Choose Delete on a category used by, e.g., 12 posts
3. Confirm — the dialog states the label will be removed from those 12 posts
4. The label is cleared from those posts; the category leaves the filter
```

### The team changes a post's status

```
1. Open a piece of feedback (status "Open")
2. Change the status to "Planned"
3. Optionally add a note (e.g. "Scheduled for Q3")
4. Confirm — the badge updates to "Planned"
5. The post now appears in the Roadmap → Planned column
6. A history entry is recorded; everyone who voted is notified
7. The status-history timeline shows the new entry
```

### Anyone filters a board by category and status

```
1. Visit a board
2. Select Status: "Planned" and Category: "UI/UX"
3. The list shows only Planned feedback tagged "UI/UX"
4. The feedback count updates
```

---

## Acceptance Criteria

**Categories**
- [ ] A Brand Admin can create a category with a name and colour
- [ ] Category names are unique within a workspace
- [ ] A Brand Admin can edit a category's name and colour
- [ ] A Brand Admin can delete a category; posts that used it lose the label
- [ ] The delete confirmation shows how many posts use the category
- [ ] A category chip is shown on feedback cards with the correct colour
- [ ] A User can optionally assign a category when submitting feedback
- [ ] The team can apply or change a post's category during triage
- [ ] Boards can be filtered by category
- [ ] Category and status filters work together (AND logic)
- [ ] The category filter is hidden when the workspace has no categories
- [ ] Categories are managed at `/{ws-slug}/settings/categories`

**Status**
- [ ] Every piece of feedback starts as Open when created
- [ ] The team can change a post's status, optionally with a note
- [ ] The status badge on the card and detail page updates immediately
- [ ] Each status change is recorded in an append-only history
- [ ] Setting a status to its current value records no history and sends no notifications
- [ ] Everyone who voted is notified when a status changes
- [ ] No notifications are sent when a post has no voters
- [ ] The status-history timeline is shown on feedback detail to everyone; the actor (who changed the status) is shown only to the team (Brand Admins and Team Members)
- [ ] Boards can be filtered by status
- [ ] Planned, In Progress, and Completed feedback appears on the public [Roadmap](09-public-roadmap.md)

---

## Related Features

- [Feedback Posts](05-feedback-posts.md) — where categories and statuses are applied
- [Roadmap](09-public-roadmap.md) — driven by status
- [Changelog](10-changelog.md) — manual release announcements
- [Notifications](11-notifications.md) — voter notifications on status change
