# IdeaRoads — Documentation

This folder is the single source of truth for IdeaRoads. It describes **what the product is** so that anyone — product, design, or engineering — can understand and build the platform from these documents alone.

The documentation is split into two parts:

- **Product specification** (this folder) — what IdeaRoads is, its roles, features, journeys, and rules.
- **[Implementation reference](implementation/)** — how it is built (tech stack, database, jobs, architecture). Kept separate so the product spec stays focused on the product.

---

## What is IdeaRoads?

IdeaRoads is a user feedback and feature-voting platform. Brands use it to collect product feedback from their customers, let them vote on what matters, track progress on a public roadmap, and announce releases through a changelog — all under their own brand.

**Inspired by:** Upvoty, Canny, Fider
**License:** MIT
**Deployment:** Self-hostable

---

## The Four Product Roles

IdeaRoads has **exactly four product roles**. Full definitions and the complete permission matrix are in **[PLATFORM.md](PLATFORM.md)**.

| Role | Scope | Description |
|---|---|---|
| **Platform Admin** | Platform | Internal IdeaRoads staff — manages every workspace, suspends/deletes workspaces, manages platform users |
| **Brand Admin** | Workspace | Paying customer — creates and owns a workspace, manages everything inside it |
| **Team Member** | Workspace | Invited helper — manages feedback and replies to customers; every Team Member has the same fixed permissions |
| **User** | Public | A brand's customer — reads the portal and, once signed in, creates feedback, votes, comments, follows the roadmap, reads the changelog |

> "Owner", "Admin", "Member", "Superadmin", and "Guest" are **not** product roles.

---

## How to Read This Documentation

1. Start with **[PLATFORM.md](PLATFORM.md)** — the platform architecture: roles, hierarchy, permission matrix, user journeys, workspace lifecycle, public vs private pages, API access, navigation, feature ownership, and glossary.
2. Read **[MASTER.md](MASTER.md)** — the product blueprint and the feature build order.
3. Read the **[feature files](#features)** in order. Each describes one feature end-to-end: what it does, who uses it, every flow, and acceptance criteria.
4. Consult **[implementation/](implementation/)** only when you need a technical detail (a table, an env var, a folder path).

---

## Document Index

### Product Specification

| File | Description |
|---|---|
| [PLATFORM.md](PLATFORM.md) | Platform architecture — roles, hierarchy, permission matrix, journeys, lifecycle, public/private pages, API access, navigation, feature ownership, glossary |
| [MASTER.md](MASTER.md) | Product blueprint — what the product is, feature summaries, and build order |

### Features

| #   | File | Feature | What it covers |
| --- | --- | --- | --- |
| 00  | [00-landing-page.md](features/00-landing-page.md) | Landing Page | Public marketing homepage |
| 01  | [01-authentication.md](features/01-authentication.md) | Authentication | Passwordless sign in (Magic Link, Google), post-auth routing |
| 02  | [02-workspaces.md](features/02-workspaces.md) | Workspaces | Workspace creation, onboarding, editing, deletion |
| 03  | [03-team-members.md](features/03-team-members.md) | Team Members | Invites, team management, ownership transfer |
| 04  | [04-feedback-boards.md](features/04-feedback-boards.md) | Feedback Boards | Boards, public/private visibility, archive vs delete |
| 05  | [05-feedback-posts.md](features/05-feedback-posts.md) | Feedback Posts | Submitting feedback, sorting, filtering, merge, moderation |
| 06  | [06-voting.md](features/06-voting.md) | Voting | Signed-in and email-based voting, vote counts |
| 07  | [07-comments.md](features/07-comments.md) | Comments | Threaded comments, replies, deletion |
| 08  | [08-categories-and-status.md](features/08-categories-and-status.md) | Categories & Status | Categories and the feedback status workflow |
| 09  | [09-public-roadmap.md](features/09-public-roadmap.md) | Public Roadmap | Status-driven public roadmap and its visibility |
| 10  | [10-changelog.md](features/10-changelog.md) | Changelog | Release announcements, linked feedback, RSS |
| 11  | [11-notifications.md](features/11-notifications.md) | Notifications | Email and in-app notifications |
| 12  | [12-workspace-settings-moderation.md](features/12-workspace-settings-moderation.md) | Workspace Settings & Moderation | Settings, moderation, webhooks, API keys, audit log |
| 13  | [13-orbit-admin.md](features/13-orbit-admin.md) | Platform Admin | Platform-management area for Platform Admins |

### Implementation Reference

| File | Description |
|---|---|
| [implementation/README.md](implementation/README.md) | Index of technical reference docs |
| [implementation/TECH-STACK.md](implementation/TECH-STACK.md) | Tech stack, dependencies, design decisions, environment variables |
| [implementation/DATABASE.md](implementation/DATABASE.md) | Full database schema and role mapping |
| [implementation/ARCHITECTURE.md](implementation/ARCHITECTURE.md) | Routes, folder structure, engineering conventions |
| [implementation/JOBS.md](implementation/JOBS.md) | Background jobs and outbound webhooks |
| [implementation/INTEGRATIONS.md](implementation/INTEGRATIONS.md) | Optional config (SMTP, Google OAuth, storage, webhooks) — database vs. `.env`, encryption, restart-required exceptions |

---

## Feature Build Order

Features depend on one another — build them in this sequence:

```
Phase 1 — Foundation
  01  Authentication
  02  Workspaces
  03  Team Members

Phase 2 — Core Feedback Loop
  04  Feedback Boards
  05  Feedback Posts
  06  Voting
  07  Comments

Phase 3 — Organisation & Discovery
  08  Categories & Status
  09  Public Roadmap
  10  Changelog

Phase 4 — Platform Layer
  11  Notifications
  12  Workspace Settings & Moderation
  13  Platform Admin

Phase 5 — Marketing
  00  Landing Page
```
