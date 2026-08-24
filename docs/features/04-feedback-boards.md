# Feature 04 — Feedback Boards

> Product behaviour for Feedback Boards. For technical reference (schema, service layer, API, components) see [`../implementation/features/04-feedback-boards.md`](../implementation/features/04-feedback-boards.md). Roles and permissions follow [`../PLATFORM.md`](../PLATFORM.md).

## Overview

Feedback Boards are the core containers for feedback within a [workspace](../PLATFORM.md#11-terminology-glossary). Each board is a public (or private) space where [Users](../PLATFORM.md#2-product-roles) submit posts and vote. Boards give a brand a way to organise incoming feedback by topic — for example, separating "Feature Requests" from "Bugs" — so the team can collect, triage, and prioritise it cleanly.

A workspace can have up to a configured number of **active boards** (currently 10). Every board has a clean public URL of the form `/{ws-slug}/b/{board-slug}`.

A default **"Feature Requests"** board is created automatically when a workspace is created (see [Feature 02 — Workspaces](02-workspaces.md)).

---

## Core Behaviour

- Boards belong to a single workspace — there are no cross-workspace boards.
- Each board has a name, an optional description, and a short URL slug that is unique within its workspace.
- **Visibility** is either **Public** (anyone can read; signing in is required to submit, vote, or comment) or **Private** (visible to workspace members only).
- A workspace can have up to a configured number of **active (non-archived) boards** (currently 10). Archived boards do not count toward this limit.
- Boards can be **reordered** to control the order they appear in the workspace navigation.
- Boards can be **archived** — an archived board is hidden from the public and from the workspace sidebar, but all of its posts, votes, and comments are preserved.
- Boards can be **deleted**. Deleting a board permanently removes the board and all the posts, votes, and comments inside it.
- A board can always be deleted when it is **archived**. An **active** board can be deleted only while **more than one active board** remains — a workspace can never delete its last active board. To remove the last active board, the Brand Admin archives it (or creates another board) first.

---

## Who Can Manage Boards

Creating, editing, archiving, deleting, and reordering boards are **[Brand Admin](../PLATFORM.md#2-product-roles)** actions only. Managing board structure is reserved to the Brand Admin; [Team Members](../PLATFORM.md#2-product-roles) cannot manage boards.

- **Brand Admin** — full control over every board in their workspace.
- **Team Member** — can view all boards (including private ones), but cannot create, edit, archive, delete, or reorder boards.
- **User** — can view **public** boards; cannot manage any board.

This mirrors the [platform permission matrix](../PLATFORM.md#4-complete-permission-matrix).

---

## Public vs Private Boards

| Behaviour | Public Board | Private Board |
|---|---|---|
| View board + posts | Anyone (Users) | Workspace members only |
| Submit a post | Any signed-in User | Workspace members only |
| Vote on posts | Any signed-in User | Workspace members only |
| Shown in public roadmap | Yes | No |
| Discoverable by search engines | Yes | No |
| Shown in workspace navigation | Members always see it | Members always see it |

A private board is invisible to anyone outside the workspace — its URL behaves as though the board does not exist, so its existence is never leaked.

---

## Archived Boards

Archiving is a reversible way to retire a board without losing its history. An archived board can be unarchived at any time, provided the workspace is not already at its active-board limit.

| Behaviour | Active Board | Archived Board |
|---|---|---|
| Shown in public board list | Yes | No |
| Shown in workspace navigation | Yes | No (hidden from sidebar) |
| Brand Admin can view | Yes | Yes (via the archived boards list) |
| Accepts new post submissions | Yes | No |
| Accepts new votes | Yes | No |
| Shown in public roadmap | Yes | No |
| Existing posts preserved | Yes | Yes |
| Counts toward the board limit | Yes | No |

**Archive vs delete.** Archiving hides a board from the public while preserving all of its data, and is fully reversible. Deleting permanently removes the board and everything in it. A workspace can never delete its last active board — it must be archived (or another board created) first.

---

## User Flows

### Create a Board

```
1. Brand Admin clicks "New Board" in the workspace navigation or dashboard
2. A creation dialog opens
3. They enter a name (required), an optional description, and a visibility (default: Public)
4. A slug is suggested from the name and can be edited
5. On submit, the board is created and added to the workspace
6. The new board appears in the sidebar and the Brand Admin lands on it
```

If the workspace is already at its active-board limit, board creation is unavailable until a board is archived or deleted.

### Edit a Board

```
1. Brand Admin opens the board's settings
2. They change the name, slug, description, or visibility
3. On save, the board is updated
4. If the slug changed, the board's URL updates accordingly
```

### Archive a Board

```
1. Brand Admin opens the board's settings
2. They choose "Archive Board" and confirm
3. The board is removed from public view and the workspace sidebar
4. All posts are preserved and remain accessible via the archived boards list
```

### Unarchive a Board

```
1. Brand Admin opens the archived boards list
2. They choose "Unarchive" on a board
3. If the workspace is at its active-board limit, unarchiving is blocked until another board is archived or deleted
4. Otherwise the board reappears in the sidebar and public view
```

### Delete a Board

```
1. Brand Admin opens the board's settings
2. They choose "Delete Board"
3. If this is the only active board, deletion is unavailable, with an explanation
4. They confirm by typing the board name
5. The board and all of its posts, votes, and comments are permanently removed
6. They are returned to the workspace
```

### Reorder Boards

```
1. Brand Admin drags a board into a new position in the workspace navigation
2. The new order is applied immediately
3. The order persists across page loads
```

---

## Acceptance Criteria

- [ ] A Brand Admin can create a board with a name, description, and visibility.
- [ ] A slug is suggested from the board name and can be edited.
- [ ] Reserved and duplicate slugs within the workspace are rejected.
- [ ] A new board appears in the workspace navigation immediately after creation.
- [ ] Creating a board beyond the active-board limit shows a clear error.
- [ ] A Brand Admin can edit a board's name, slug, description, and visibility.
- [ ] Changing the slug updates the board's URL.
- [ ] A Brand Admin can archive a board — it disappears from public view.
- [ ] An archived board still shows its posts when viewed by the Brand Admin.
- [ ] A Brand Admin can unarchive a board, unless the workspace is at its active-board limit.
- [ ] A Brand Admin can delete an archived board after confirming by name.
- [ ] A Brand Admin cannot delete the only active board; the action is unavailable with an explanation.
- [ ] Deleting a board removes all of its posts, votes, and comments.
- [ ] A Brand Admin can reorder boards in the workspace navigation, and the order persists after reload.
- [ ] A public board is reachable at `/{ws-slug}/b/{board-slug}` without signing in.
- [ ] A private board is not reachable by non-members and does not reveal its existence.
- [ ] An archived board shows a "no longer accepting submissions" notice to the public while keeping its posts readable.
- [ ] Team Members cannot create, edit, archive, delete, or reorder boards; only the Brand Admin can.
</content>
