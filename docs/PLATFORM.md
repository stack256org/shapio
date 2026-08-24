# IdeaRoads — Platform Architecture

> The single source of truth for **what IdeaRoads is**: its roles, hierarchy, permissions, journeys, and terminology.
> This document describes the **product**, not its implementation. For technical reference (tech stack, database, jobs, architecture) see [`implementation/`](implementation/).
> Where this document and any feature document differ, **this document wins**.

---

## 1. Platform Overview

IdeaRoads is a multi-tenant SaaS for collecting product feedback, prioritising it, and communicating progress back to customers. It is operated as a platform by IdeaRoads staff, used by paying brands to run their own feedback operation, and visited by those brands' end customers.

The product is built around four nested layers:

```
IdeaRoads  (the platform — operated by IdeaRoads staff)
    ↓
Brand      (a paying customer's workspace)
    ↓
Team       (the people inside a brand who manage feedback)
    ↓
Customers  (the brand's end users, who submit and vote on feedback)
```

- **IdeaRoads** is the platform itself. It hosts every brand, governs the platform, and is run by internal staff (**Platform Admins**).
- A **Brand** is a single paying customer, represented by a **Workspace**. Each workspace is fully isolated — its own boards, feedback, roadmap, changelog, team, and settings. It is owned and operated by a **Brand Admin**.
- A **Team** is the group of people a Brand Admin invites to help run the workspace. Each helper is a **Team Member**.
- **Customers** are the brand's end users — the public. They visit the brand's feedback portal as **Users** to submit feedback, vote, comment, follow the roadmap, and read the changelog.

---

## 2. Product Roles

IdeaRoads has **exactly four product roles**. There are no others. There is no "Guest", "Workspace Admin", "Superadmin", "Owner", "Member", "Anonymous User", or "Authenticated User" as a *product role* — those terms are never used in product documentation.

### 1. Platform Admin
- Internal IdeaRoads staff only.
- Manages the IdeaRoads platform.
- Can manage every workspace.
- Can suspend workspaces.
- Can delete workspaces.
- Can manage platform users.
- Can access Platform Admin.
- Never belongs to a customer's workspace.

### 2. Brand Admin
- Paying customer.
- Creates a workspace.
- Owns and manages their brand.
- Can invite Team Members.
- Can manage Boards.
- Can manage Categories.
- Can manage Statuses.
- Can moderate feedback.
- Can publish Roadmap.
- Can publish Changelog.
- Can create API Keys.
- Can create Webhooks.
- Can manage everything inside **their** workspace only.
- **Brand Admin is a single product role.** Some Brand Admins additionally *own* the workspace they created; only the Brand Admin who owns a workspace can transfer ownership or delete the workspace. Ownership is a property of a Brand Admin, not a separate role.

### 3. Team Member
- Invited by a Brand Admin.
- Works inside one or more workspaces.
- Helps manage customer feedback.
- Helps organise the roadmap.
- Helps reply to customers.
- **Every Team Member has the same fixed set of permissions.** There is no per-member configuration — a Brand Admin invites a Team Member and that person receives the standard Team Member permissions described in the [permission matrix](#4-complete-permission-matrix).
- Never accesses workspace settings or Platform Admin.

### 4. User
- Customer / Visitor / End User of a brand.
- Visits the brand's public feedback portal.
- Can create feedback.
- Can vote.
- Can comment.
- Can follow the Roadmap.
- Can read the Changelog.
- Never manages the workspace.

> **Browsing is open; participating requires signing in.** Anyone can read a brand's public boards, roadmap, and changelog without an account. To **create feedback, vote, comment, or follow the roadmap**, a User must sign in first. "Signed in" is a requirement for participation, not a separate role — every customer is a **User**.

### One person, different roles

Roles describe a person's relationship to a specific workspace (or, for Platform Admin, to the platform) — they are not a permanent global label. The same person can hold different roles in different places at the same time. For example, one person might be:

- an **Platform Admin** for the platform,
- the **Brand Admin** of the workspace they created,
- a **Team Member** in a colleague's workspace, and
- a **User** on an unrelated brand's public portal.

Each role applies only in its own context.

---

## 3. Platform Hierarchy Diagram

```
IdeaRoads
│
├── Platform Admin                  (internal staff — governs the whole platform)
│
├── Brand A                      (a workspace)
│     ├── Brand Admin            (owns and operates the workspace)
│     ├── Team Member            (invited helpers)
│     └── Users                  (the brand's public customers)
│
├── Brand B                      (a workspace)
│     ├── Brand Admin
│     ├── Team Member
│     └── Users
│
└── Brand C                      (a workspace)
      ├── Brand Admin
      ├── Team Member
      └── Users
```

- Platform Admin sits **above** all brands and is not part of any workspace.
- Each brand is an isolated workspace. People and data never cross between brands.
- A Brand Admin and Team Members are **internal** to one brand; Users are the **public** customers of that brand.

---

## 4. Complete Permission Matrix

Legend: ✅ = can perform · ❌ = cannot.

A ✅ in the **User** column means a **signed-in** User. Reading public pages (boards, roadmap, changelog) needs no account; **creating feedback, voting, commenting, and following the roadmap require signing in**.

| Action | Platform Admin | Brand Admin | Team Member | User |
|---|:---:|:---:|:---:|:---:|
| **Platform** | | | | |
| Access Platform Admin | ✅ | ❌ | ❌ | ❌ |
| View platform dashboard / stats | ✅ | ❌ | ❌ | ❌ |
| Suspend / unsuspend any workspace | ✅ | ❌ | ❌ | ❌ |
| Delete any workspace | ✅ | ❌ | ❌ | ❌ |
| Manage platform users | ✅ | ❌ | ❌ | ❌ |
| Grant / revoke Platform Admin access | ✅ | ❌ | ❌ | ❌ |
| Impersonate a user (when enabled) | ✅ | ❌ | ❌ | ❌ |
| Manage plans / platform settings / feature flags | ✅ | ❌ | ❌ | ❌ |
| **Workspace lifecycle** | | | | |
| Create a workspace | ❌¹ | ✅ | ❌ | ✅² |
| Edit workspace settings (name, slug, logo, visibility) | ✅³ | ✅ | ❌ | ❌ |
| Delete the workspace | ❌ | ✅⁴ | ❌ | ❌ |
| Transfer workspace ownership | ❌ | ✅⁴ | ❌ | ❌ |
| **Team** | | | | |
| Invite Team Members | ❌ | ✅ | ❌ | ❌ |
| Manage the team (change role, remove a member) | ❌ | ✅ | ❌ | ❌ |
| Leave a workspace | ❌ | ❌⁵ | ✅ | ❌ |
| **Boards & organisation** | | | | |
| Create / edit / archive / delete Boards | ✅³ | ✅ | ❌ | ❌ |
| Reorder Boards | ✅³ | ✅ | ❌ | ❌ |
| Create / edit / delete Categories | ✅³ | ✅ | ❌ | ❌ |
| Define / edit Statuses | ✅³ | ✅ | ❌ | ❌ |
| **Feedback** | | | | |
| View public boards, roadmap & changelog (read) | ✅ | ✅ | ✅ | ✅⁶ |
| View private boards | ✅³ | ✅ | ✅ | ❌ |
| Create feedback | ❌ | ✅ | ✅ | ✅ |
| Edit / delete own feedback | ❌ | ✅ | ✅ | ✅ |
| Vote on feedback | ❌ | ✅ | ✅ | ✅ |
| Comment / reply on feedback | ❌ | ✅ | ✅ | ✅ |
| Triage feedback (assign category, change status) | ✅³ | ✅ | ✅ | ❌ |
| Pin / move / merge feedback | ✅³ | ✅ | ✅ | ❌ |
| Remove others' feedback & comments (clean-up) | ✅³ | ✅ | ✅ | ❌ |
| Configure moderation (approval mode, spam rules, block/unblock users) | ✅³ | ✅ | ❌ | ❌ |
| **Communication** | | | | |
| Organise the Roadmap (via statuses) | ✅³ | ✅ | ✅ | ❌ |
| Publish / unpublish Roadmap | ✅³ | ✅ | ❌ | ❌ |
| Create / edit / publish Changelog | ✅³ | ✅ | ❌ | ❌ |
| Follow the Roadmap | ❌ | ✅ | ✅ | ✅ |
| **Integrations & advanced** | | | | |
| Create / revoke API Keys | ❌ | ✅ | ❌ | ❌ |
| Create / manage Webhooks | ❌ | ✅ | ❌ | ❌ |
| View workspace audit log | ✅³ | ✅ | ❌ | ❌ |

**Footnotes**
1. Platform Admins do not create workspaces for themselves; they govern existing brands. A workspace is always created by the Brand Admin who owns it.
2. A **User** becomes a **Brand Admin** at the moment they create a workspace. Creating a workspace is how someone enters the platform as a paying customer.
3. Platform Admins can perform workspace-scoped actions **only while impersonating** a workspace member, and only when impersonation is enabled by the platform (impersonation is opt-in, time-limited, and audited). Outside impersonation, Platform Admins never act inside a workspace.
4. Deleting the workspace and transferring ownership are reserved to the **Brand Admin who owns** the workspace.
5. The Brand Admin who owns the workspace cannot simply leave; they must transfer ownership or delete the workspace first.
6. Reading public pages needs no account. The other ✅ marks in the User column require the User to be signed in.

> **Team Member permissions are fixed.** Every Team Member in a workspace has exactly the same permissions — there is no per-member configuration. Team Members handle day-to-day feedback: creating, voting, commenting and replying, triaging (status and category), pinning / moving / merging, and removing inappropriate feedback and comments. Team Members **cannot** change workspace structure (boards, categories, statuses), configure moderation, publish the roadmap or changelog, manage the team, open workspace settings, or use API keys and webhooks.

> **Billing (Future scope).** Billing and plan management for a workspace are **not part of the MVP**. When introduced in a future release, billing will be managed by the Brand Admin who owns the workspace. It is intentionally absent from the matrix above.

---

## 5. Complete User Journeys

### Platform Admin
```
Login
   ↓
Orbit Dashboard
   ↓
Manage Platform
   ├── Review workspaces (suspend / delete)
   ├── Manage platform users (grant / revoke Platform Admin)
   ├── Tune plans, platform settings, feature flags
   └── Monitor platform health
```

### Brand Admin
```
Signup
   ↓
Create Workspace
   ↓
Create Board
   ↓
Invite Team
   ↓
Publish Feedback Portal
   ↓
Receive Feedback
   ↓
Publish Roadmap
   ↓
Publish Changelog
```

### Team Member
```
Invitation
   ↓
Login
   ↓
Workspace
   ↓
Moderate Feedback
   ↓
Reply to Customers
   ↓
Update Status
```

### User
```
Visit Feedback Portal   (browse without an account)
   ↓
Sign in to participate
   ↓
Create Feedback
   ↓
Vote
   ↓
Comment
   ↓
Follow Roadmap
   ↓
Read Changelog
```

---

## 6. Workspace Lifecycle

The life of a brand on IdeaRoads, from signup to ongoing operation:

```
Signup
   ↓
Workspace Creation
   ↓
Board Creation
   ↓
Invite Team
   ↓
Launch Feedback Portal
   ↓
Collect Feedback
   ↓
Prioritise
   ↓
Roadmap
   ↓
Release
   ↓
Changelog
```

| Stage | What happens | Who drives it |
|---|---|---|
| Signup | A person signs in to IdeaRoads | User |
| Workspace Creation | They create a workspace and become its Brand Admin | Brand Admin |
| Board Creation | One or more feedback boards are set up | Brand Admin |
| Invite Team | Team Members are invited to help | Brand Admin |
| Launch Feedback Portal | The public portal goes live for customers | Brand Admin |
| Collect Feedback | Signed-in customers submit, vote, and comment | User |
| Prioritise | The team triages, categorises, and ranks feedback | Brand Admin / Team Member |
| Roadmap | Prioritised items are surfaced on the public roadmap via status | Brand Admin / Team Member |
| Release | Work is completed | Brand Admin / Team Member |
| Changelog | Releases are announced to customers | Brand Admin |

A workspace may also be **suspended** or **deleted** by a Platform Admin at the platform level; a suspended workspace is unavailable to everyone until a Platform Admin restores it.

---

## 7. Public vs Private Pages

Every page in IdeaRoads belongs to exactly one access tier.

| Page | Tier | Audience |
|---|---|---|
| Landing page | Public | Anyone (no account) |
| Sign in | Public | Anyone (no account) |
| Invite acceptance | Public link | The invited person |
| Public board | Public (read) | Anyone can read; signing in is required to create, vote, or comment |
| Feedback post detail | Public (read) | Anyone can read; signing in is required to vote or comment |
| Public roadmap | Public (read) | Anyone can read; signing in is required to vote or follow |
| Public changelog (+ RSS) | Public (read) | Anyone |
| Private board | Workspace only | Brand Admin, Team Member |
| Workspace dashboard | Workspace only | Brand Admin, Team Member |
| Workspace settings (general, members, categories, moderation, webhooks, API keys, audit log) | Workspace only | Brand Admin |
| Changelog editor | Workspace only | Brand Admin |
| In-app notifications | Workspace only | Signed-in workspace members |
| Orbit dashboard & all Orbit pages | Orbit only | Platform Admin |

**Access tiers defined**

- **Public** — reachable without signing in. Public pages are **read-only** to people who are not signed in; participating (creating feedback, voting, commenting, following the roadmap) requires signing in. Some public pages also depend on a Brand Admin setting (e.g. a workspace's roadmap or changelog can be made private).
- **Workspace only** — reachable only by members of that specific workspace (Brand Admin and Team Members). Other brands' members cannot see it.
- **Orbit only** — reachable only by Platform Admins. Invisible to everyone else.

**Browsing vs participating**

- **A visitor who is not signed in** can browse public boards, the roadmap, and the changelog (read-only).
- **A signed-in User** can additionally create feedback, vote, comment, and follow the roadmap, sees their own votes highlighted, and receives notifications.

---

## 8. API Access Matrix

Every API in IdeaRoads belongs to one access tier.

| API area | Tier | Who can call it |
|---|---|---|
| Authentication endpoints | Public | Anyone |
| Read public boards, posts, roadmap, changelog | Public | Anyone |
| Create feedback / vote / comment / follow | Authenticated | Any signed-in User |
| Workspace data & configuration (boards, categories, members, moderation, settings) | Workspace only | Brand Admin (Team Members for their permitted feedback actions) |
| Changelog management | Workspace only | Brand Admin |
| Webhooks & API key management | Workspace only | Brand Admin |
| Programmatic workspace API (via API Key) | API key | Holder of a valid workspace API key |
| Platform management (workspaces, users, plans, settings, flags, jobs) | Orbit only | Platform Admin |

**Tier definitions**

- **Public** — no authentication required; read-only.
- **Authenticated** — caller must be a signed-in User. Creating feedback, voting, commenting, and following require this tier.
- **Workspace only** — caller must be a member of the target workspace; the action must be permitted for their role.
- **API key** — server-to-server access scoped to a single workspace, authorised by a workspace API key created by a Brand Admin.
- **Orbit only** — caller must be a Platform Admin. These endpoints are invisible to non-platform-admins.

---

## 9. Navigation Flow

How each role moves through the product, including the redirects that route people to the right place.

### Entry & sign-in (all roles)
```
Visit IdeaRoads → Landing page
   ↓ (Sign in)
Sign-in page → magic link or Google (or email + password, if an Orbit Admin has enabled it)
   ↓ (after authentication)
Post-auth routing:
   ├── No workspace yet        → Onboarding (create first workspace)
   ├── Member of workspace(s)  → Workspace dashboard
   └── Following an invite link → Invite acceptance → Workspace dashboard
```

### Brand Admin
```
Workspace dashboard
   ├── Boards → board view → post detail
   ├── Roadmap (manage + publish)
   ├── Changelog (create, edit, publish)
   ├── Notifications
   └── Settings
         ├── General (name, slug, logo, visibility, delete workspace)
         ├── Members (invite, roles, remove, transfer ownership)
         ├── Categories
         ├── Moderation (approval, spam rules, blocked users)
         ├── Webhooks
         ├── API Keys
         └── Audit log
```

### Team Member
```
Workspace dashboard
   ├── Boards (including private) → board view → post detail
   │     └── Triage: change status, assign category, reply, remove spam
   ├── Roadmap (organise via status)
   └── Notifications
(Settings, team, webhooks, and API keys are not shown to Team Members.)
```

### User
```
Brand's public feedback portal
   ├── Public board → (sign in to) submit feedback, vote, comment
   ├── Post detail → (sign in to) vote, comment, follow updates
   ├── Roadmap → read; (sign in to) vote or follow
   └── Changelog → read releases (+ RSS)
(No access to workspace dashboard, settings, or Orbit.)
```

### Platform Admin
```
Sign in (same sign-in page as everyone)
   ↓
Orbit dashboard
   ├── Workspaces → workspace detail → suspend / delete
   ├── Users → user detail → grant/revoke Platform Admin, impersonate
   ├── Plans
   ├── Platform settings
   ├── Feature flags
   ├── Job queue
   └── Platform audit log
```

**Key redirect rules**

- A signed-in person with **no workspace** is sent to onboarding.
- A signed-in person **with** a workspace lands on their workspace dashboard.
- A not-signed-in visitor can read public pages; attempting to create feedback, vote, comment, or follow prompts them to sign in.
- A **Team Member** or **User** who reaches a Brand-Admin-only or Orbit-only page is denied access; Orbit pages are invisible (not found) to non-platform-admins rather than showing a forbidden screen.
- A visitor to a **suspended** workspace sees an unavailable notice instead of the portal.

---

## 10. Feature Ownership

Who owns — i.e. is the primary actor for — each major feature.

| Feature | Owner | Notes |
|---|---|---|
| Feedback (creation) | **User** | Signed-in customers submit feedback on public boards |
| Voting | **User** | Signed-in customers upvote feedback |
| Comments | **User** | Signed-in customers (and the team) discuss feedback |
| Boards | **Brand Admin** | Defines where feedback is collected |
| Categories | **Brand Admin** | Defines how feedback is classified |
| Statuses | **Brand Admin** | Defines the workflow states feedback moves through |
| Moderation (configuration) | **Brand Admin** | Approval mode, spam rules, blocking users |
| Feedback triage (status, categorising, replying, removing spam) | **Team Member** | Day-to-day handling of incoming feedback |
| Roadmap (publishing) | **Brand Admin** | Decides what the public roadmap shows and whether it is public |
| Changelog (publishing) | **Brand Admin** | Announces releases to customers |
| Team Members | **Brand Admin** | Invites and manages the workspace team |
| Workspace settings | **Brand Admin** | Owns workspace configuration |
| API Keys & Webhooks | **Brand Admin** | Owns integrations |
| Notifications | **System** | Delivered automatically to signed-in Users and the team based on events |
| Platform Admin / platform governance | **Platform Admin** | Manages all workspaces, users, plans, and platform settings |
| Billing | **Future scope** | Not in the MVP; will belong to the owning Brand Admin when introduced |

---

## 11. Terminology (Glossary)

| Term | Definition |
|---|---|
| **IdeaRoads** | The SaaS platform itself, operated by internal staff and used by many brands. |
| **Platform Admin** | An internal IdeaRoads staff member who governs the entire platform. One of the four product roles. |
| **Brand** | A single paying customer of IdeaRoads, represented by one workspace. |
| **Brand Admin** | The paying customer who creates, owns, and operates a workspace. A single product role; the Brand Admin who owns the workspace may also transfer ownership or delete it. One of the four product roles. |
| **Team Member** | A person invited by a Brand Admin to help manage feedback inside a workspace. Every Team Member has the same fixed permissions. One of the four product roles. |
| **Team** | The collective group of Team Members (and the Brand Admin) working inside a workspace. |
| **User** | A customer / visitor / end user of a brand who reads the portal and — once signed in — creates feedback, votes, comments, follows the roadmap, and reads the changelog. One of the four product roles. |
| **Workspace** | The isolated environment for one brand — its boards, feedback, roadmap, changelog, team, and settings. One workspace = one brand. |
| **Board** | A collection of feedback within a workspace (e.g. "Feature Requests", "Bugs"). Can be public or private. |
| **Category** | A label a workspace defines to classify feedback (e.g. "UI", "Performance"). |
| **Status** | The workflow state of a piece of feedback (e.g. open, planned, in progress, completed). Drives the roadmap. |
| **Feedback** | A single idea, request, or report submitted by a User to a board. (Also called a "post".) |
| **Roadmap** | The public view of where feedback stands — what's planned, in progress, and completed — derived from statuses. |
| **Changelog** | The public record of releases and updates a brand publishes to its customers. |
| **Feedback Portal** | The public-facing pages of a workspace (boards, roadmap, changelog) where customers participate. |
| **Platform Admin (panel)** | The platform-management area used exclusively by Platform Admins. |
| **Suspension** | A platform action by a Platform Admin that makes a workspace temporarily unavailable. |
| **Impersonation** | A platform capability that lets a Platform Admin temporarily act as a specific user for support; disabled by default, time-limited, and audited. |

> **Deprecated terms — never use in product documentation.** "Owner", "Admin", "Member", "Superadmin", "Guest", "Anonymous User", "Authenticated User", "Workspace Admin". The product recognises only the four roles above. Any internal naming the system may use is an implementation detail and lives solely in [`implementation/`](implementation/) — it must never appear in product documentation.
