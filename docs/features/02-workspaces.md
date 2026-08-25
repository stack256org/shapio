# Feature 02 — Workspaces

> Product behaviour for workspaces. For technical reference (API, service layer, components, jobs) see [../implementation/features/02-workspaces.md](../implementation/features/02-workspaces.md). For roles and permissions see [../PLATFORM.md](../PLATFORM.md).

## Overview

A **Workspace** is the top-level container in IdeaRoads, and represents a single brand. Everything — boards, feedback, votes, the team, changelog entries — lives inside a workspace. Each workspace has its own **slug**, which forms the base of every URL: `/{ws-slug}/...`

A person can own or belong to multiple workspaces and switch between them from the sidebar. When someone signs in for the first time and has no workspace, they are taken to `/onboarding` to create one. The moment they create a workspace, they become its **Brand Admin**.

---

## Core Behaviour

- One person can create or belong to multiple workspaces.
- Each workspace is fully isolated — no data is shared between workspaces.
- The workspace **slug** is unique across the whole platform and appears in every URL.
- A default **"Feature Requests"** board is created automatically with every new workspace.
- Only the **Brand Admin who owns the workspace** can delete it.
- Deleting a workspace permanently removes all of its data and notifies every member by email.
- Workspace settings (name, slug, description, logo) are editable by a **Brand Admin**.

---

## Roles & Access

Workspaces follow the four product roles defined in [../PLATFORM.md](../PLATFORM.md):

- **Brand Admin** — creates, owns, and manages the workspace and everything inside it. Workspace ownership is an attribute of the Brand Admin who created it.
- **Team Member** — invited by the Brand Admin to help; cannot change workspace settings, manage the team, or delete the workspace.
- **User** — the brand's customer; never accesses the workspace dashboard or settings.
- **Platform Admin** — internal IdeaRoads staff; may suspend or delete any workspace at the platform level but never belongs to a workspace.

| Action | Who can do it |
|---|---|
| Create a workspace | Any signed-in person (becomes its Brand Admin) |
| Edit workspace name / slug / description / logo | Brand Admin |
| Delete the workspace | Brand Admin who owns it |
| Switch between workspaces | Any member (Brand Admin, Team Member) |
| Suspend or delete at the platform level | Platform Admin |

---

## Pages

| Page | Purpose | Audience |
|---|---|---|
| `/onboarding` | Create the first (or an additional) workspace | Any signed-in person |
| `/{ws-slug}` | Workspace dashboard — overview of boards, quick actions | Brand Admin, Team Member |
| `/{ws-slug}/settings/general` | Edit workspace details; delete workspace (Danger Zone) | Brand Admin |

The workspace dashboard lists every board (name, post count, visibility) and offers quick actions to create a board or invite a member. On first visit after creation it shows a dismissible welcome banner. If the workspace has no boards beyond the default, it prompts the Brand Admin to create their first board.

The sidebar navigation shows Dashboard, the list of boards, Roadmap, Changelog, and Notifications. Settings and the "New Board" action are shown only to a Brand Admin. Administrative views (All Posts, Changelog editing) are available to workspace members according to the permissions a Brand Admin grants.

---

## Slug Rules

Every workspace slug must:

- Be 2 to 50 characters long.
- Contain only lowercase letters, numbers, and hyphens.
- Not start or end with a hyphen.
- Be unique across the entire platform.
- Not be a reserved word (e.g. `api`, `admin`, `orbit`, `settings`, `onboarding`).

When a workspace is created, a slug is suggested automatically from the name (special characters are stripped — "Acme & Co!" becomes `acme-co`). The Brand Admin can override the suggestion. If a generated slug is already taken, a number is appended until it is unique.

---

## User Flows

### Create First Workspace (new person)

```
1. Person completes sign-in (magic link or Google)
2. They have no workspace yet → taken to /onboarding
3. They type a workspace name → a slug is suggested and previewed
4. They submit the form
5. The workspace is created with the person as Brand Admin and a default
   "Feature Requests" board
6. They land on /{ws-slug} with a welcome banner
```

### Create Additional Workspace

```
1. Open the workspace switcher → "Create workspace"
2. Taken to /onboarding
3. Same form flow as above
4. On success: land on the new /{ws-slug} with a welcome banner
```

### Switch Workspace

```
1. Open the workspace switcher in the sidebar
2. The dropdown lists every workspace the person belongs to, with a role badge
3. Select the target workspace
4. Navigate to /{target-ws-slug}
5. The dashboard loads in the context of the new workspace
```

### Edit Workspace

```
1. Brand Admin goes to /{ws-slug}/settings/general
2. The settings form is pre-filled with the current details
3. They edit the name or slug
4. A slug change is checked for availability in real time (green / red indicator)
5. They save
6. If the slug changed, all URLs update and they are sent to the new
   /{new-slug}/settings/general
7. A confirmation toast appears
```

### Delete Workspace

```
1. Brand Admin goes to /{ws-slug}/settings/general
2. They open the Danger Zone and choose "Delete Workspace"
3. A confirmation asks them to type the workspace name
4. Once the name matches, the Delete action is enabled
5. They confirm
6. The workspace and all of its data are permanently removed
7. They are routed to a remaining workspace, or to /onboarding if none remain
8. Every member of the deleted workspace receives a deletion email
```

---

## Product Rules & States

| Rule | Behaviour |
|---|---|
| Membership required | Visiting `/{ws-slug}` for a workspace you don't belong to is denied — you are sent to your own workspace or to sign in. |
| Old slug after a change | A changed slug does not redirect from the old URL; the old slug stops working and the new one must be used. |
| Sole Brand Admin leaving | The Brand Admin who owns the workspace cannot simply leave — they must transfer ownership or delete the workspace first. |
| Last workspace deleted | After deleting their only workspace, the person is taken to `/onboarding`. |
| Suspended workspace | A workspace suspended by a Platform Admin is unavailable to everyone until restored. |

---

## Validation Rules

| Field | Rules |
|---|---|
| Name | Required, 2–50 characters, any characters allowed |
| Slug | Required, 2–50 characters, lowercase letters / numbers / hyphens only, no leading or trailing hyphen, not a reserved word, unique platform-wide |
| Description | Optional, up to 300 characters |
| Logo | Optional |

---

## Acceptance Criteria

- [ ] A new person is taken to `/onboarding` after signing in for the first time.
- [ ] A workspace is created with a unique slug derived from its name.
- [ ] A default "Feature Requests" board is created with the workspace.
- [ ] The creator becomes the Brand Admin of the new workspace.
- [ ] The person lands on `/{ws-slug}` with a welcome banner after creation.
- [ ] The welcome banner shows on first visit and dismisses on click.
- [ ] The workspace switcher lists every workspace the person belongs to.
- [ ] Creating a second workspace works from the switcher.
- [ ] A Brand Admin can edit the workspace name, slug, and description.
- [ ] Changing the slug redirects to the new URL after saving.
- [ ] Slug availability is checked in real time as it is typed.
- [ ] Reserved slugs are blocked (e.g. `api`, `orbit`, `admin`).
- [ ] A Brand Admin can delete the workspace after typing its name to confirm.
- [ ] Deleting a workspace permanently removes all of its data.
- [ ] Every member receives a deletion email after the workspace is deleted.
- [ ] A Team Member cannot access the delete action.
- [ ] Visiting a workspace you do not belong to is denied.
- [ ] The sidebar navigation shows the correct items for each role.
