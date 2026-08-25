# Feature 03 — Team Members

> Product behaviour for team management. For schema, services, routes, jobs, and engineering notes see [implementation reference](../implementation/features/03-team-members.md).

## Overview

Team Members controls who has internal access to a workspace. A **Brand Admin** can bring people in two ways: by sending an email invite, or by sharing an invite link. When inviting, the Brand Admin chooses which **role** the new person joins as — **Brand Admin** or **Team Member**. This is a role choice, not a per-person permission setting: each role's permissions are fixed and defined in [PLATFORM.md](../PLATFORM.md), and every Team Member receives exactly the same fixed set of permissions.

This feature is entirely internal to a workspace and is separate from the public-facing **Users** who vote and comment on boards.

The four product roles are defined in [PLATFORM.md](../PLATFORM.md). Within team management, the relevant roles are:

- **Brand Admin** — a paying customer who manages the team, settings, boards, moderation, and everything inside the workspace.
- **Team Member** — an invited helper who handles feedback (triage, replies, status changes) but never accesses workspace settings or the team page. Every Team Member has the same fixed permissions.

Workspace ownership is an attribute of one Brand Admin — the Brand Admin who created the workspace. Ownership matters only for ownership-specific actions: transferring the workspace or deleting it. (When billing is introduced in a future release, it will belong to that owning Brand Admin; billing is not part of the MVP.)

---

## Core Behaviour

- Two ways to add people:
  - **Email invite** — sent to a specific address; the recipient gets a private link to accept.
  - **Shareable invite link** — a single link anyone can use to join.
- Only a **Brand Admin** can invite people.
- When inviting, the Brand Admin chooses the new person's **role** — **Brand Admin** or **Team Member**. This is a single role choice, not an adjustable list of permissions; each role's permissions are fixed.
- Only the **Brand Admin who owns the workspace** can transfer ownership or delete the workspace.
- The **Brand Admin who owns the workspace** cannot be removed and cannot leave — they must transfer ownership first (or delete the workspace).
- Any **Team Member**, and any **Brand Admin** who does not own the workspace, can leave the workspace.
- Email invites are single-use and expire after **7 days**.
- Shareable invite links are reusable until they are revoked or expire.
- Expired invites are cleaned up automatically.
- There is no hard limit on team size in the MVP.

---

## Who Can Do What

| Action | Owning Brand Admin | Other Brand Admin | Team Member |
|---|:---:|:---:|:---:|
| View the team | ✅ | ✅ | ❌ |
| Invite by email | ✅ | ✅ | ❌ |
| Create / share an invite link | ✅ | ✅ | ❌ |
| Revoke a pending invite | ✅ | ✅ | ❌ |
| Promote a Team Member to Brand Admin | ✅ | ❌ | ❌ |
| Change another Brand Admin back to Team Member | ✅ | ❌ | ❌ |
| Remove another Brand Admin | ✅ | ❌ | ❌ |
| Remove a Team Member | ✅ | ✅ | ❌ |
| Leave the workspace | ❌ | ✅ | ✅ |
| Transfer ownership | ✅ | ❌ | ❌ |
| Delete the workspace | ✅ | ❌ | ❌ |

The owning Brand Admin is the single Brand Admin who created the workspace. "Other Brand Admin" is anyone they have elevated to Brand Admin. **Users** (the brand's public customers) never appear here — they have no internal access.

---

## Pages

| Page | URL | Audience |
|---|---|---|
| Members settings | `/{ws-slug}/settings/members` | Brand Admin only |
| Email invite acceptance | `/invite/[token]` | The invited person |
| Shareable link acceptance | `/invite/link/[linkToken]` | Anyone with the link |

The members settings page shows the current team (name, email, role, joined date), lets a Brand Admin invite by email or by link, and exposes per-person actions (change role, remove, or — for the current person — leave). The owning Brand Admin also sees a Transfer Ownership action.

The team list supports searching by name or email and filtering by role.

---

## User Flows

### Invite by Email

```
1. A Brand Admin opens the members settings page.
2. They enter an email address and choose the role (Brand Admin or Team Member; default Team Member).
3. The invite is created and appears in the pending invites list.
4. The invited person receives an email with a link to accept.
5. They open the link.
   → If not signed in, they are sent to sign in, then returned to the invite.
6. The invited email must match the address the invite was sent to.
7. On acceptance, they join the workspace with the chosen role and land on the workspace welcome view.
```

### Invite via Shareable Link

```
1. A Brand Admin opens the members settings page.
2. They generate (or copy an existing) shareable invite link and choose the role link-joiners receive.
3. They share the link wherever they like.
4. Anyone who opens the link can join.
   → If not signed in, they are sent to sign in first, then returned to the invite.
5. On acceptance, they join with the link's role and land on the workspace welcome view.
6. The link stays valid and reusable until it is revoked or expires.
```

### Remove a Team Member

```
1. A Brand Admin selects Remove on a person's row and confirms.
2. The person is removed from the workspace immediately.
3. They can no longer access the workspace.
4. They receive an email letting them know they were removed.
```

### Leave a Workspace

```
1. A Team Member (or a non-owning Brand Admin) selects Leave on their own row,
   or chooses to leave from the workspace switcher, and confirms.
2. They are removed from the workspace and routed to their next workspace,
   or to onboarding if they have none left.
```

The owning Brand Admin cannot leave — they must transfer ownership or delete the workspace first.

### Transfer Ownership

```
1. The owning Brand Admin opens Transfer Ownership and selects another team member.
2. They confirm, understanding they will remain a Brand Admin but no longer own the workspace.
3. The selected person becomes the owning Brand Admin; the previous owner stays a Brand Admin.
```

### Change a Person's Role

```
1. The owning Brand Admin changes a person's role from their row.
2. A Team Member can be promoted to Brand Admin, or a Brand Admin returned to Team Member.
3. The change applies immediately.
```

A workspace must always have at least one Brand Admin; the last remaining Brand Admin cannot demote themselves.

---

## Behaviour & Edge Cases

| Case | Behaviour |
|---|---|
| Person is already on the team | Inviting them again is rejected with "This user is already a member." |
| A pending invite already exists for the email | A second invite to the same address is rejected. |
| Someone opens an invite link after they already joined | They are quietly sent to the workspace — no error. |
| An email invite has expired | The acceptance page explains the invite expired and to ask a Brand Admin for a new one. |
| Someone opens an email invite while signed in with a different address | They are told the invite was sent to a specific address and to sign in with that account. |
| A non-owning Brand Admin tries to remove another Brand Admin | Not allowed — only the owning Brand Admin can remove other Brand Admins. |
| The last Brand Admin tries to demote themselves | Blocked — the workspace must always keep at least one Brand Admin. |
| The owning Brand Admin tries to leave | Blocked — they must transfer ownership first. |
| An invite link is used after being revoked | The acceptance page shows "Invalid invite link." |
| Two people accept the same link at the same time | Both are handled cleanly; each person ends up with a single membership. |

---

## Acceptance Criteria

- [ ] A Brand Admin can invite someone by email and choose their role (Brand Admin or Team Member).
- [ ] The invite email is delivered with a working acceptance link.
- [ ] Email invites expire after 7 days.
- [ ] An expired invite shows a clear explanation, not a blank screen.
- [ ] An invited person who is not signed in is sent to sign in, then returned to the invite.
- [ ] The accepting person's email must match the invited address; a mismatch shows a clear message.
- [ ] Accepting an invite adds the person to the workspace with the chosen role.
- [ ] A Brand Admin can generate a shareable invite link.
- [ ] A shareable link is reusable — multiple people can join with it.
- [ ] A shareable link can be revoked and regenerated.
- [ ] The owning Brand Admin can promote a Team Member to Brand Admin.
- [ ] A Brand Admin can remove a Team Member; the owning Brand Admin can also remove other Brand Admins.
- [ ] A removed person receives an email notification.
- [ ] A removed person loses access to the workspace immediately.
- [ ] Any Team Member or non-owning Brand Admin can leave the workspace.
- [ ] The owning Brand Admin cannot leave (blocked with a clear message).
- [ ] The owning Brand Admin can transfer ownership to another team member.
- [ ] After a transfer, the previous owner remains a Brand Admin.
- [ ] Expired invites are removed automatically.
- [ ] The team list shows avatar, name, email, role, and joined date.
- [ ] The team list supports searching by name/email and filtering by role.
