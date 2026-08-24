# IdeaRoads — Master Product Specification

> The product blueprint for IdeaRoads — what the product is and what every feature does.
> For platform-wide architecture (roles, hierarchy, permission matrix, journeys, glossary) see **[PLATFORM.md](PLATFORM.md)**.
> For technical reference (tech stack, database, jobs, architecture) see **[implementation/](implementation/)** — this is intentionally kept out of the product specification.

---

## What IdeaRoads Is

IdeaRoads is a user feedback and feature-voting platform. Brands use it to collect product feedback from their customers, prioritise it, show progress on a public roadmap, and announce releases through a changelog — all under their own brand.

IdeaRoads is multi-tenant: the platform hosts many independent brands, each in its own isolated workspace. See **[PLATFORM.md → Platform Overview](PLATFORM.md#1-platform-overview)**.

---

## Roles

IdeaRoads has **exactly four product roles**: **Platform Admin**, **Brand Admin**, **Team Member**, and **User**. Full definitions, the hierarchy diagram, and the complete permission matrix live in **[PLATFORM.md → Product Roles](PLATFORM.md#2-product-roles)**.

| Role | Scope | In one line |
|---|---|---|
| **Platform Admin** | Platform | Internal IdeaRoads staff who govern the entire platform |
| **Brand Admin** | Workspace | The paying customer who owns and operates a workspace |
| **Team Member** | Workspace | A helper invited by the Brand Admin to manage feedback |
| **User** | Public | A customer of the brand who creates feedback, votes, and comments |

> "Owner", "Admin", "Member", "Superadmin", and "Guest" are **not** product roles. They never appear in product documentation.

---

## Authentication

Users sign in without a password:

- **Magic Link** — enter an email, receive a one-time login link, click to sign in.
- **Google** — one-click sign in / register.

There is no password to create, forget, or reset. The same sign-in flow serves everyone — Users, Team Members, Brand Admins, and Platform Admins.

Anyone can browse a brand's public boards, roadmap, and changelog without an account. **Creating feedback, voting, commenting, and following the roadmap all require signing in.** See **[Feature 1 — Authentication](features/01-authentication.md)**.

---

## Features

Each feature has its own specification in [`features/`](features/). The summaries below describe **what** each feature does; the linked file covers the full product behaviour, flows, and acceptance criteria.

### Feature 1 — [Authentication](features/01-authentication.md)
Passwordless sign in and registration via Magic Link or Google. After signing in, a person is routed to their workspace if they have one, or to onboarding to create their first workspace.

### Feature 2 — [Workspaces](features/02-workspaces.md)
A workspace is one brand's isolated environment — its own boards, feedback, roadmap, changelog, team, and settings. A User creates a workspace during onboarding and becomes its Brand Admin. Brand Admins can edit workspace details and delete the workspace. A default board is created with each new workspace.

### Feature 3 — [Team Members](features/03-team-members.md)
A Brand Admin invites people to help run the workspace — by email or a shareable link. Invited people join as Team Members, and every Team Member receives the same fixed permissions. The Brand Admin manages the team: removing members and transferring ownership. Team Members can leave at any time.

### Feature 4 — [Feedback Boards](features/04-feedback-boards.md)
Boards organise feedback within a workspace (e.g. "Feature Requests", "Bugs"). A board is public (visible on the feedback portal) or private (workspace-only). Brand Admins create, reorder, archive, and delete boards.

### Feature 5 — [Feedback Posts](features/05-feedback-posts.md)
Users submit feedback to a board with a title and description. Feedback can be sorted (trending, newest, top voted) and filtered (status, category, board). The team can pin, change status, move between boards, merge duplicates, and delete feedback.

### Feature 6 — [Voting](features/06-voting.md)
Users upvote feedback to signal demand after signing in. Vote counts appear on every feedback card. Each User counts once per piece of feedback.

### Feature 7 — [Comments](features/07-comments.md)
Users discuss feedback through comments and one level of replies. Authors can delete their own comments; the team can delete any comment. Deleting a comment preserves the surrounding thread.

### Feature 8 — [Categories & Status](features/08-categories-and-status.md)
**Categories** are workspace-defined labels for classifying feedback. **Statuses** are the workflow states feedback moves through (open, under review, planned, in progress, completed, closed). The team assigns categories and changes statuses; status changes notify the people who voted.

### Feature 9 — [Public Roadmap](features/09-public-roadmap.md)
The roadmap is a public view of where feedback stands — grouped into Planned, In Progress, and Completed — derived automatically from statuses. Brand Admins choose whether the roadmap is public. No sign-in is required to view it.

### Feature 10 — [Changelog](features/10-changelog.md)
Brand Admins announce releases through changelog entries (title, body, label, date). Entries can be linked to feedback, and publishing notifies the people who voted on those items. The changelog is available publicly, including an RSS feed.

### Feature 11 — [Notifications](features/11-notifications.md)
The product keeps people informed through email and in-app notifications: new feedback, status changes, comments and replies, invites, and published changelog entries. Signed-in people also get an in-app notification bell with unread counts.

### Feature 12 — [Workspace Settings & Moderation](features/12-workspace-settings-moderation.md)
The Brand Admin's control center: workspace details and visibility, team management, categories, moderation (approval rules, spam filtering, blocking users), outbound webhooks, API keys, and an audit log of workspace actions.

### Feature 13 — [Platform Admin](features/13-orbit-admin.md)
The platform-management area used only by Platform Admins. It provides oversight of every workspace and user, the ability to suspend or delete workspaces, plan and platform-setting management, feature flags, and platform health monitoring.

### Feature 00 — [Landing Page](features/00-landing-page.md)
The public marketing homepage that introduces IdeaRoads and routes visitors to sign up.

---

## Feature Build Order

Features depend on one another and are built in this sequence.

| # | Feature | Depends On |
|---|---|---|
| 1 | [Authentication](features/01-authentication.md) | — |
| 2 | [Workspaces](features/02-workspaces.md) | Authentication |
| 3 | [Team Members](features/03-team-members.md) | Workspaces |
| 4 | [Feedback Boards](features/04-feedback-boards.md) | Workspaces |
| 5 | [Feedback Posts](features/05-feedback-posts.md) | Boards |
| 6 | [Voting](features/06-voting.md) | Posts |
| 7 | [Comments](features/07-comments.md) | Posts |
| 8 | [Categories & Status](features/08-categories-and-status.md) | Posts, Boards |
| 9 | [Public Roadmap](features/09-public-roadmap.md) | Posts, Status |
| 10 | [Changelog](features/10-changelog.md) | Posts, Workspaces |
| 11 | [Notifications](features/11-notifications.md) | Posts, Comments, Status, Changelog |
| 12 | [Workspace Settings & Moderation](features/12-workspace-settings-moderation.md) | Workspaces, Team Members |
| 13 | [Platform Admin](features/13-orbit-admin.md) | All |
| 00 | [Landing Page](features/00-landing-page.md) | — (build last) |

---

## Where to Find Things

| You want… | Go to |
|---|---|
| Roles, hierarchy, permissions, journeys, glossary | [PLATFORM.md](PLATFORM.md) |
| What a specific feature does | [features/](features/) |
| Public vs private pages, API access tiers | [PLATFORM.md](PLATFORM.md#7-public-vs-private-pages) |
| Tech stack, database, jobs, architecture | [implementation/](implementation/) |

---

*This file is the product specification for the IdeaRoads MVP. It describes what the product is. Update it as product decisions change. Implementation details are deliberately kept in [implementation/](implementation/).*
