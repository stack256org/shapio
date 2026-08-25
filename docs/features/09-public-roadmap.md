# Feature 09 — Public Roadmap

> Product behaviour. For technical reference (data, components, SEO, notes) see [`../implementation/features/09-public-roadmap.md`](../implementation/features/09-public-roadmap.md).

## Overview

The Public Roadmap is a shareable, read-only view of where a workspace's feedback stands — what's planned, what's in progress, and what has shipped. It is **automatically derived from feedback statuses**: there is no separate roadmap to manage, no manual curation, and no drag-and-drop ordering. As the team triages feedback by changing its [status](08-categories-and-status.md), the roadmap updates itself.

The roadmap lives at the clean URL `/{ws-slug}/roadmap` and is public by default — no sign-in required to read it. Voting on a roadmap item and following the roadmap require signing in. The Brand Admin decides whether the roadmap is public or private.

---

## Core Behaviour

- The roadmap is reached at `/{ws-slug}/roadmap`.
- It is organised into three fixed columns, in order: **Planned** | **In Progress** | **Completed**.
- Each column is populated automatically from feedback status:
  - **Planned** — feedback marked *planned*
  - **In Progress** — feedback marked *in progress*
  - **Completed** — feedback marked *completed*
- Feedback in any other status (open, under review, closed) does not appear on the roadmap.
- The roadmap is auto-populated — there is no separate roadmap management step and no manual ordering. Surfacing an item on the roadmap is simply a matter of giving its feedback one of the three roadmap statuses.
- Within each column, items are ordered by votes (most-voted first), and pinned items appear first.
- **Public view vs team view of the same roadmap:**
  - The **public roadmap** (what [Users](../PLATFORM.md#2-product-roles) see) includes only feedback from **public boards**. Feedback on private boards is excluded.
  - The **team roadmap** (what the Brand Admin and Team Members see inside the workspace) includes feedback from private boards as well, so the team has the complete picture.
- **Roadmap visibility:**
  - When the roadmap is **public**, anyone can view it without signing in.
  - When the roadmap is **private**, only workspace members can view it; to everyone else the roadmap appears not to exist (rather than showing a "forbidden" screen).
- Each roadmap card shows the item's vote count, comment count, [category](08-categories-and-status.md) (if assigned), and source board.
- **Reading the roadmap needs no account.** Anyone can browse the three columns of a public roadmap without signing in. **Voting on a roadmap card and following the roadmap require signing in** — there is no anonymous, guest, or email voting.
- A signed-in User can vote on roadmap cards directly, without first opening the board.
- Each card links to the full feedback detail, where the User can read, and — once signed in — vote and comment.

---

## Roles & Visibility

- **Organising the roadmap** — changing feedback statuses to move items between the Planned, In Progress, and Completed columns — is done by **the team**: both the Brand Admin and Team Members, as part of feedback triage. This is a fixed Team Member permission.
- **Publishing or unpublishing the roadmap** — making it public or private — is reserved to the **Brand Admin**, from workspace settings. Team Members never publish or unpublish the roadmap.
- **Users** read the public roadmap: anyone can browse the three columns and open the full feedback detail without an account. **Voting on a card and following the roadmap require signing in.**

When the roadmap is public, a **Roadmap** link appears in the brand's public navigation alongside Boards and Changelog. When the roadmap is private, that link is hidden.

---

## How Items Reach the Roadmap

The roadmap is driven entirely by feedback status, so the team never edits the roadmap directly:

- **Surfacing an item.** When a Team Member or Brand Admin changes a piece of feedback from, say, *open* to *planned*, that item automatically appears in the Planned column. No additional action is needed. Voters on that feedback are notified of the status change.
- **Moving an item across columns.** Changing a status from *planned* to *in progress* moves the item from the Planned column to the In Progress column. Voters are notified.
- **Removing an item.** Changing a status away from the three roadmap statuses removes the item from the roadmap.
- **Public vs private boards.** If a piece of feedback moves from a public board to a private board, it disappears from the **public** roadmap (but remains on the team roadmap).

---

## Visibility Setting

The Brand Admin controls roadmap visibility from workspace settings (see [Workspace Settings](02-workspaces.md)):

- **Public roadmap on** — the roadmap is shown at `/{ws-slug}/roadmap`, anyone with the link can view it, and the Roadmap link appears in the public navigation.
- **Public roadmap off** — the roadmap is hidden from the public; non-members who visit see no indication it exists. Workspace members can still view it. The Roadmap link is removed from the public navigation.

---

## User Flows

### A User follows the public roadmap

```
1. Anyone opens /{ws-slug}/roadmap and reads it (no sign-in required).
2. The three columns load: Planned, In Progress, Completed.
3. They see, for example: 4 planned items, 2 in progress, 12 completed.
4. To vote on an item or follow the roadmap, they sign in.
5. The signed-in User votes on an item directly from its roadmap card.
6. The User opens an item to read its full detail, comment, or follow updates.
```

### A Team Member surfaces an item on the roadmap

```
1. A piece of feedback is currently marked "open".
2. A Team Member changes its status to "planned".
3. The item automatically appears in the Planned column.
4. Voters on that feedback are notified of the status change.
```

### A Team Member moves an item across columns

```
1. A Team Member changes a feedback item from "planned" to "in progress".
2. The item leaves the Planned column and appears in In Progress.
3. Voters are notified of the status change.
```

### A Brand Admin makes the roadmap private

```
1. The Brand Admin opens workspace settings.
2. They turn the public roadmap off.
3. The public roadmap is no longer reachable by non-members and gives no
   indication it exists.
4. The Roadmap link disappears from the brand's public navigation.
5. Workspace members can still view the roadmap.
```

---

## Empty States

When a column has no items, it shows a friendly placeholder instead of an empty space:

- **Planned** — "Nothing planned yet. Submit ideas on the feedback board."
- **In Progress** — "Nothing in progress right now."
- **Completed** — "Nothing shipped yet. Check back soon."

Because the roadmap is read-only for Users, empty states carry no action button.

---

## Acceptance Criteria

- [ ] The public roadmap loads and is readable at `/{ws-slug}/roadmap` without sign-in when it is public.
- [ ] Three columns are shown: Planned, In Progress, Completed.
- [ ] Each column shows the correct items based on feedback status.
- [ ] Feedback from private boards is excluded from the public roadmap.
- [ ] Items within each column are ordered by votes (most-voted first).
- [ ] Pinned items appear first within their column.
- [ ] Each card links to the full feedback detail.
- [ ] Signed-in Users can vote on roadmap cards directly.
- [ ] Voting on a card and following the roadmap require signing in; a not-signed-in visitor who attempts either is prompted to sign in.
- [ ] A signed-in User's existing votes are reflected on the cards.
- [ ] The source board name on a card links to that board.
- [ ] A category is shown on a card when one is assigned.
- [ ] An empty column shows an appropriate placeholder message.
- [ ] The roadmap is responsive: three columns on desktop, stacked on mobile.
- [ ] When the roadmap is private, non-members see no indication it exists.
- [ ] Workspace members can still view the roadmap when it is private.
- [ ] The Brand Admin can switch the roadmap between public and private from workspace settings.
- [ ] The Roadmap link appears in (or disappears from) the public navigation based on the visibility setting.
- [ ] The team roadmap includes feedback from private boards.
- [ ] Changing a feedback item's status to planned, in progress, or completed adds it to the roadmap automatically.
- [ ] Changing a feedback item's status away from those statuses removes it from the roadmap.
