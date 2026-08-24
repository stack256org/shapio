# Feature 05 — Feedback Posts

> Product behaviour for Feature 05. For roles and permissions see [PLATFORM.md](../PLATFORM.md). For technical reference (database, services, jobs, components) see [Implementation reference](../implementation/features/05-feedback-posts.md).

## Overview

Feedback posts are the core unit of IdeaRoads. A post is a single piece of customer feedback — a feature request, bug report, or idea — submitted to a board. Every post has a title, an optional description, a status, a vote count, and a comment count.

Anyone can read posts on a public board. Creating a post requires a **verified email**, not necessarily an account: on the Public Portal a visitor fills in the form, and is asked to confirm their email with a 6-digit code at submit time (their draft is preserved while they do). Inside the admin app and the embed widget, authors are signed-in Users as before. The team (Brand Admin and Team Members) handles posts day to day — pinning, changing status, moving between boards, merging duplicates, deleting, and approving. A post's author can edit or delete their own post within the limits below, provided they have an account — accountless submissions are final for their author, though the team can still edit and moderate them. Posts inherit the visibility of the board they belong to.

---

## Core Behaviour

- A **signed-in User** can submit a post to a public board.
- A **visitor with no account** can also submit to a public board on the Public Portal, after confirming their email with a one-time code. The post is attributed to that verified address, which workspace members see for moderation; the byline everyone else reads is the display name they optionally supply, falling back to "User" — a verified email address is never published on a public board. Browsing needs no verification at all — only submitting does. Gated by the `guest_voting` feature flag.
- Private and archived boards remain members-only; an unverified or accountless visitor can never reach them.
- Each post lives at a clean, shareable URL: `/{ws-slug}/b/{board-slug}/p/{postId}-{slug}`. The trailing slug is derived from the title for readability; the post can always be resolved from the identifier in the URL.
- The board post list defaults to **Trending** sort, which surfaces posts gaining votes recently ahead of older posts with the same total. It also offers **Newest** and **Top Voted** sorts.
- **Pinned posts** always appear at the top of the list, regardless of the active sort.
- Posts move through a workflow of statuses: **Open**, **Under Review**, **Planned**, **In Progress**, **Completed**, and **Closed**. Status drives the public roadmap.
- The team can: pin/unpin a post, change its status, move it to another board, merge it into another post, delete it, and approve it (when moderation holds it for review).
- The author can edit their post's title and description, and delete their own post while it has no votes.
- Merging a post combines its votes into the target post and locks the merged post (it can no longer be edited or voted on). The target's comment thread also gets a summary comment recapping the merged post's title and description, attributed to its original author, so the merge is visible without leaving the target's page; the merged post's own comments stay put on its own page.
- Moving a post to another board updates its URL to reflect the new board's slug; the old URL redirects to the new one.
- Descriptions are plain text.
- **Moderation** is a workspace setting that controls whether new feedback is published immediately or held for approval:
  - **Off** — every new post is published immediately.
  - **Automatic** — posts are checked against the workspace's spam keywords; clean posts publish immediately, flagged posts are held for the team to review.
  - **Manual** — every new post is held for the team to approve before it becomes public.

---

## Statuses

Each status has a distinct colour so the team and customers can scan a board at a glance.

| Status | Meaning | Colour |
|---|---|---|
| Open | New, not yet triaged | Grey |
| Under Review | Being evaluated by the team | Yellow |
| Planned | Accepted and scheduled | Blue |
| In Progress | Actively being worked on | Purple |
| Completed | Shipped | Green |
| Closed | Not proceeding (or merged) | Red |

Status changes are recorded as a **status history** — an append-only trail showing each transition, who made it, and an optional note. This history is visible on the post detail page and feeds the public roadmap.

---

## Sorting & Filtering

The controls above every board list let people organise the view:

- **Sort**: Trending (default) · Newest · Top Voted.
- **Status filter**: All, or any single status.
- **Category filter**: narrow to a category (see [Categories & Status](08-categories-and-status.md)).
- **Board filter**: posts are always scoped to the board being viewed; moving a post changes which board it appears on.
- **My Votes** toggle (signed-in Users): show only posts the User has voted on (see [Voting](06-voting.md)).
- A live post count is shown alongside the controls.

Pinned posts always lead the list. Merged posts are hidden from active lists. Posts held by moderation are visible only to the team until approved.

---

## Pages

### Public board

The public board page (`/{ws-slug}/b/{board-slug}`) lists a board's posts for customers. It shows the sort and filter controls, the post list (pinned first, then sorted), and a **Submit Feedback** action. A private board is not visible to people outside the workspace. An archived board is shown read-only with a banner and no submit action.

### Post detail

The post detail page (`/{ws-slug}/b/{board-slug}/p/{postId}-{slug}`) shows the full post — title, description, author, date, status badge, vote count — along with its comment thread (see [Comments](07-comments.md)) and voting (see [Voting](06-voting.md)). The team sees handling actions (pin, status, move, merge, approve, delete); the author sees edit/delete actions for their own post. If the post has been moved, visiting an old URL redirects to its current one.

---

## User Flows

### Submit feedback (signed-in User)

```
1. User signs in and opens a public board
2. Clicks "Submit Feedback"
3. Enters a title — similar existing posts are surfaced as a gentle warning (the User may proceed anyway)
4. Optionally adds a description and a category
5. Submits
6. Moderation off / automatic (clean): post appears in the list — "Submitted!"
7. Moderation manual / automatic (flagged): "Your post is pending review"
```

### Team changes a post's status

```
1. A team member opens the post detail page
2. Selects a new status (e.g. "Planned"), with an optional note
3. The status badge updates and the change is recorded in the status history
4. Voters are notified of the status change (see Notifications, Feature 11)
```

### Team merges duplicate posts

```
1. A team member opens the duplicate (source) post
2. Chooses "Merge" and searches for the post to keep (target)
3. Confirms — votes transfer to the target, the source is locked and marked merged, and a summary comment recapping the source's content is added to the target's thread
4. The source shows a "Merged into: {target title}" badge and leaves the active list
```

### Team moves a post to another board

```
1. A team member opens the post detail page
2. Chooses "Move" and selects the destination board
3. The post moves and its URL updates to the new board's slug
```

### Author edits their own post

```
1. The author opens their post
2. Chooses "Edit" — title and description become editable
3. Saves — the post updates in place ("Post updated")
```

### Author deletes their own post

```
1. The author opens their post (no votes yet)
2. Chooses "Delete" and confirms
3. The post is removed and the author returns to the board
4. Once a post has votes, the delete action is no longer available to the author
```

---

## Moderation Behaviour

When moderation is **off**, every new post is public the moment it is submitted.

When moderation is **automatic**, each new post is checked against the workspace's spam keywords. Clean posts are published immediately; flagged posts are held in a review queue for the team.

When moderation is **manual**, every new post is held for the team to approve. Held posts appear in the team's board view with a pending state; approving a post publishes it and triggers the new-post notification to the team. Held posts are never visible to customers until approved.

Adding a spam keyword affects only future submissions — already-approved posts are not re-checked.

---

## Validation Rules

| Field | Rules |
|---|---|
| Title | Required, 5–150 characters |
| Description | Optional, up to 5000 characters |
| Status | Must be one of the defined statuses |
| Merge target | Must be in the same workspace, must differ from the source, must not already be merged |
| Move target | Must be in the same workspace, must differ from the current board |

---

## Edge Cases

| Case | Handling |
|---|---|
| Post submitted to an archived board | Rejected — "This board is no longer accepting submissions" |
| A not-signed-in visitor tries to submit feedback | They are prompted to sign in first; the post is created only after they sign in |
| Team tries to merge a post that is already merged | Rejected — "This post has already been merged" |
| Old URL visited after a post was moved | Redirects to the post's current URL |
| Author tries to delete a post that has votes | The delete action is unavailable; the attempt is refused |
| A duplicate is approved after another copy was already approved | Both remain; the team can merge them |
| Spam keyword added after posts were already approved | Existing posts are unaffected; the filter applies only to new submissions |
| Two team members change the same post's status at once | The last change wins |
| Status changed to the status it already has | No change is recorded and no notification is sent |
| Board deleted while a post detail page is open | The page shows "Post not found" |

---

## Acceptance Criteria

- [ ] A signed-in User can submit a post with a title and optional description
- [ ] A not-signed-in visitor is prompted to sign in before they can submit feedback
- [ ] With moderation off, a post appears in the board list immediately
- [ ] With moderation manual, a post shows a "pending review" state until approved
- [ ] A similar-title warning is shown before submission
- [ ] The board list defaults to Trending sort
- [ ] The list supports Newest and Top Voted sorts
- [ ] Pinned posts always appear first, regardless of sort
- [ ] A post detail page loads at `/{ws-slug}/b/{board-slug}/p/{postId}-{slug}`
- [ ] A moved post redirects from its old URL to its new one
- [ ] A post detail shows author, date, status badge, vote count, and comment count
- [ ] The team can pin/unpin a post
- [ ] The team can change a post's status, and the badge updates
- [ ] A status change is recorded in the status history
- [ ] The team can move a post to another board
- [ ] The team can merge a post — votes transfer to the target and the source is locked
- [ ] A merged post shows a "Merged into: {title}" badge
- [ ] The author can edit their own post's title and description
- [ ] The author can delete their own post only while it has no votes
- [ ] The team can delete any post regardless of votes
- [ ] The team is notified by email when a post is approved/published
- [ ] The spam-keyword filter flags posts when moderation is automatic
