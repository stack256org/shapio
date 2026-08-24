# Feature 07 — Comments

> Product behaviour for Feature 07. For roles and permissions see [PLATFORM.md](../PLATFORM.md). For technical reference (database, services, jobs, components) see [Implementation reference](../implementation/features/07-comments.md).

## Overview

Comments let people discuss a piece of feedback. A signed-in **User** can comment on a feedback post, and the team can join the conversation too. On the Public Portal, a visitor with no account can also comment once they confirm their email with a 6-digit code — the prompt appears in place and their draft is submitted for them as soon as they verify. Reading the discussion needs no account or verification. Comments support **one level of replies**: you can reply to a top-level comment, but not to a reply.

**Accountless comments are final.** A guest cannot edit or delete what they posted, and cannot react to comments (reactions need an account). Workspace members retain full moderation over guest comments, which are labelled with a **Guest** badge in the moderation queue. Accountless commenting is gated by the `guest_voting` feature flag.

A comment author can delete their own comment, and the team (Brand Admin and Team Members) can remove any comment — a fixed team permission. Deleting a comment never breaks the thread — its text is replaced with a *"[deleted]"* placeholder and the surrounding replies stay readable. When a Brand Admin turns on comment moderation in workspace settings, new comments are held for approval before they appear publicly.

---

## Core Behaviour

- Comments belong to a feedback post — the discussion lives on that post's detail page.
- Replies are **one level deep**. A reply attaches to a top-level comment; replies cannot themselves be replied to.
- Commenting and replying **require an identified author** — a signed-in User comments using their account; a Public Portal visitor comments after confirming their email. Reading the thread needs neither.
- Editing and deleting your own comment require an **account**; accountless comments are final.
- Comments on a private board are only visible to members of that workspace.
- **Comment moderation** is a workspace setting configured by the Brand Admin:
  - **Off** (default) — comments appear immediately.
  - **On** — every new comment is held for the team to approve before it appears publicly.
- A comment author can delete their own comment. The team (Brand Admin and Team Members) can remove any comment — a fixed team permission.
- Deleting a comment **preserves the thread**: the comment's text becomes a *"[deleted]"* placeholder, and any replies beneath it remain visible in context.
- The team can approve pending comments when moderation is on.
- Each feedback post shows a **comment count**, surfaced on feedback cards in the board list.
- Comments cannot be edited in MVP — to change a comment, delete it and post a new one.

---

## The Comment Thread

A thread is a flat list of top-level comments, each of which may have a single level of replies:

```
Comment A (top-level)
  └── Reply A1
  └── Reply A2

Comment B (top-level)
  └── Reply B1

Comment C (top-level, no replies)
```

- Replies appear indented beneath the comment they answer.
- Replies cannot have their own replies — the "Reply" action is not offered on a reply.
- A deleted comment keeps its place in the thread, shown as *"[deleted]"*, so the replies beneath it still make sense.
- Long threads are paged, loading more top-level comments on demand.

---

## Comment Moderation

Comment moderation is controlled per workspace (see [Workspace Settings & Moderation](12-workspace-settings-moderation.md)).

| Setting | What happens to a new comment |
|---|---|
| Off (default) | Appears immediately and counts toward the post's comment count. |
| On | Held for approval, not shown publicly, and not counted until the team approves it. |

When moderation is on, the team reviews pending comments and either **approves** them (they become public and count toward the post) or **removes** them.

---

## Notifications

The conversation is kept moving by email:

- When a new top-level comment is posted, the post's author is notified — unless they wrote the comment themselves.
- When someone replies to a comment, that comment's author is notified — unless they wrote the reply themselves.

When moderation is on, these notifications are sent only after a comment is approved.

---

## Deleting a Comment

Deleting is a graceful action that keeps the discussion intact:

| Scenario | Result |
|---|---|
| Top-level comment with replies | Comment shows *"[deleted]"*; replies remain visible. |
| Top-level comment with no replies | Comment shows *"[deleted]"*. |
| Reply | Reply shows *"[deleted]"*. |
| Comment count on the post | Decreases by one (for a comment that was counted). |

---

## User Flows

### A User posts a comment

1. The User opens a feedback post's detail page.
2. They see the comment thread; a comment box appears once they are signed in.
3. They write their comment and post it.
4. With moderation off, the comment appears in the thread immediately.
5. With moderation on, they're told the comment is pending review.
6. The post's author is notified (unless they are the commenter).

### A User replies to a comment

1. The User selects "Reply" on a top-level comment.
2. An inline reply box opens beneath that comment.
3. They write the reply and post it.
4. The reply appears indented under the comment.
5. The comment's author is notified (unless they wrote the reply).
6. No "Reply" action is offered on the reply itself.

### An author deletes their own comment

1. The author selects "Delete" on their comment and confirms.
2. The comment's text becomes *"[deleted]"*.
3. The post's comment count decreases.
4. Any replies beneath the comment stay visible.

### The team removes any comment

1. A Brand Admin or Team Member sees a "Delete" action on every comment.
2. They can remove any comment — a fixed team permission.
3. The deletion behaves the same way — the thread is preserved.

### The team approves a pending comment (moderation on)

1. A pending comment is shown with a "Pending" badge.
2. The team member approves it.
3. The comment becomes visible publicly and counts toward the post.
4. The relevant notifications are sent.

---

## Edge Cases

| Case | Handling |
|---|---|
| A not-signed-in visitor tries to comment | Not allowed — they are prompted to sign in first. |
| A non-member tries to comment on a private board | Not allowed — private boards are visible only to workspace members. |
| Replying to a deleted comment | Allowed — the deleted comment keeps its place, so the reply is valid. |
| Commenting on a closed post | Not allowed — the post shows that comments are closed. |
| Commenting on a post that isn't published yet | Not allowed — the post isn't public. |
| A commenter's account is later deleted | The comment text is preserved and shown as authored by a deleted user. |
| The post is deleted | Its comments are removed along with it. |
| Submitting the same comment twice | The submit action is disabled while a comment is being posted to avoid duplicates. |
| A very long thread | Top-level comments load in pages, with a "Load more" action. |

---

## Acceptance Criteria

- [ ] A signed-in User can post a top-level comment on a post.
- [ ] A not-signed-in visitor is prompted to sign in before commenting.
- [ ] Comments appear immediately when moderation is off.
- [ ] Comments show a "Pending review" state when moderation is on.
- [ ] The team can approve pending comments.
- [ ] A User can reply to a top-level comment.
- [ ] A reply appears indented below its parent comment.
- [ ] The "Reply" action is not offered on a reply (no nested replies).
- [ ] A comment author can delete their own comment.
- [ ] The team (Brand Admin and Team Members) can remove any comment.
- [ ] A deleted comment shows *"[deleted]"* and the thread structure is preserved.
- [ ] Replies beneath a deleted comment remain visible.
- [ ] The post author is notified of a new approved top-level comment.
- [ ] The post author is not notified when they comment on their own post.
- [ ] A comment author is notified of a new approved reply.
- [ ] A comment author is not notified when they reply to themselves.
- [ ] The post's comment count rises when an approved comment is added.
- [ ] The post's comment count falls when a comment is deleted.
- [ ] The comment count is shown on feedback cards in the board list.
- [ ] Comments are hidden on private boards for non-members.
</content>
