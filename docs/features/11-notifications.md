# Feature 11 — Notifications

> For the technical implementation (API endpoints, email delivery, background jobs, polling, unsubscribe), see [`../implementation/features/11-notifications.md`](../implementation/features/11-notifications.md).

## Overview

Notifications keep everyone informed about activity that matters to them — without anyone having to refresh a page or check back manually. When something happens to feedback they care about, or to a workspace they belong to, IdeaRoads tells them automatically.

Notifications are delivered through **two channels**:

- **Email** — sent to the recipient's inbox so they stay in the loop without keeping the product open.
- **In-app** — a notification bell shown inside a workspace.

Because participating in a brand — creating feedback, voting, commenting, or following the roadmap — [requires signing in](../PLATFORM.md#7-public-vs-private-pages), every notification recipient is a signed-in person. [Brand Admins](../PLATFORM.md#2-brand-admin), [Team Members](../PLATFORM.md#3-team-member), and [Users](../PLATFORM.md#4-user) therefore all receive **both** channels: email **and** the in-app bell. ([Platform Admins](../PLATFORM.md#1-orbit-admin) are internal staff and are not part of a customer workspace's notifications.)

---

## Notification Events

IdeaRoads sends a notification for each of the following events. Every recipient is a signed-in person, so each event reaches its recipients through **both** the in-app bell and email.

| Event | Who is notified |
|---|---|
| **New feedback submitted** | The team (Brand Admin and Team Members) |
| **Status changed** | Everyone who voted on that piece of feedback |
| **New comment** | The author of the feedback |
| **Reply to a comment** | The author of the parent comment |
| **Workspace invite** | The invited person |
| **Changelog published** | Everyone who voted on the feedback linked to that release |

**Who counts as "the team":** the Brand Admin who owns the workspace and the Team Members they have invited. These are the people responsible for handling incoming feedback, so they are the ones alerted when new feedback arrives.

**Self-notifications are suppressed.** People are never notified about their own actions — the team member who changes a status is not notified about that change, an author who comments on their own feedback is not notified, and so on.

---

## In-App Notifications

Recipients inside a workspace see a **notification bell** in the workspace navigation.

- The bell shows an **unread count badge** when there are unread notifications. Counts above 99 are shown as "99+".
- The count stays current on its own — recipients see new notifications appear without reloading the page.
- Clicking the bell opens the full notifications page.

### The notifications page

The notifications page lives at the clean URL **`/{ws-slug}/notifications`** and lists everything a person has received in that workspace, newest first, grouped by recency (Today, This Week, Earlier).

- Each notification shows a short title, an optional longer description, and how long ago it happened. Unread notifications are visually distinct (a highlighted background and a dot).
- **Clicking a notification opens the relevant page** — for example, the feedback post it relates to, the members settings, or the changelog entry — and marks that notification as read.
- A person can **mark a single notification as read** by opening it, or **mark all as read** with one action.
- Visiting the notifications page marks everything in that workspace as read, so the bell badge clears.
- When a person has no notifications, an **empty state** explains what will appear here ("When feedback you've voted on gets updates, or when someone comments on your feedback, you'll see them here.").

---

## Email Notifications

Every recipient of a notification event also receives an email. Emails:

- Are clean, readable, and consistent with the IdeaRoads brand.
- Include a clear **call-to-action link** that takes the recipient straight to the relevant feedback, invite, or changelog entry.
- Include a **one-click unsubscribe** link in the footer, so recipients can opt out of that kind of email. Unsubscribing is respected on all future emails of that type.

---

## How the Two Channels Work Together

| Recipient | Email | In-app bell |
|---|---|---|
| Brand Admin | Yes | Yes |
| Team Member | Yes | Yes |
| User | Yes | Yes |

Because every recipient is signed in, all three receive both channels. In-app and email notifications describe the same events; the bell and the notifications page simply give people a place to review their history.

---

## Acceptance Criteria

**In-app notifications**

- [ ] A notification bell is visible in the workspace navigation for signed-in people.
- [ ] The bell shows an unread count badge when there are unread notifications, displayed as "99+" above 99.
- [ ] The unread count updates on its own without a page reload.
- [ ] Clicking the bell opens the notifications page at `/{ws-slug}/notifications`.
- [ ] The notifications page lists notifications grouped by recency, with unread ones visually distinct.
- [ ] Clicking a notification marks it as read and opens the relevant page.
- [ ] "Mark all as read" clears all unread notifications in the workspace.
- [ ] Visiting the notifications page marks everything in that workspace as read and clears the bell badge.
- [ ] An empty state is shown when there are no notifications.

**Email notifications**

- [ ] New feedback submitted notifies the team.
- [ ] A status change notifies everyone who voted on that feedback.
- [ ] A new comment notifies the feedback author.
- [ ] A reply notifies the author of the parent comment.
- [ ] A workspace invite notifies the invited person.
- [ ] A published changelog entry notifies the voters of the linked feedback.
- [ ] Every recipient receives the event through both the in-app bell and email.
- [ ] Self-notifications are suppressed across every event.
- [ ] Every email includes a correct call-to-action link.
- [ ] Every email includes a working one-click unsubscribe link, and unsubscribing is honoured on future emails of that type.
