# Landing Page

> Product specification for the IdeaRoads landing page. For technical reference (rendering, components, SEO, config) see [`../implementation/features/00-landing-page.md`](../implementation/features/00-landing-page.md).

## Goal

Communicate IdeaRoads's value proposition to developers, indie makers, and product teams — the prospective Brand Admins who will run a feedback operation on IdeaRoads — and convert them into self-hosters or GitHub stargazers.

The landing page lives at the site root and is the public face of the IdeaRoads product itself (not any single brand's workspace). It is a **Public** page: its audience is anyone, with no sign-in required (see [PLATFORM § Public vs Private Pages](../PLATFORM.md#7-public-vs-private-pages)). It is fast and mobile-responsive.

This page is meant for the hosted IdeaRoads.com instance, not for self-hosted deployments — it's controlled by the `NEXT_PUBLIC_SHOW_LANDING_PAGE` environment variable. A self-hosted instance leaves it unset (the default), so `/` sends a logged-out visitor straight to `/signin` instead of showing marketing copy for a product they've already installed.

---

## Scope

- A public marketing homepage at the site root.
- No sign-in required — open to anyone.
- Static, near-static content — no real-time data.
- Links out to GitHub, the documentation, and the sign-in / get-started flow.
- No pricing page in MVP (self-hosted, free).
- No blog, and no changelog for IdeaRoads itself (separate from the in-app Changelog feature each brand publishes).

---

## Visitor Flow

The landing page is for anonymous visitors — no one needs to sign in to read it.

### New visitor (developer / indie maker / product team)

1. Arrives from GitHub, a social post, or a search result.
2. Reads the headline and subheadline — understands what IdeaRoads is within a few seconds.
3. Sees the closed-loop diagram — understands the product is end-to-end, not just a feedback board.
4. Scrolls through the feature highlights — confirms it covers their use case.
5. Reads the "Open source & self-hosted" section — understands the pricing model and the data-ownership promise.
6. Clicks **Get Started** to begin sign-up, or **View on GitHub** to explore the repository.
7. Optionally scrolls to the quick-start instructions to see how fast they can self-host.

### Returning visitor

1. Arrives at the landing page.
2. Clicks **Sign In** in the navigation to reach the sign-in flow.

---

## Page Sections

### 1. Navigation Bar

| Element     | Purpose                                                              |
| ----------- | ------------------------------------------------------------------- |
| Logo        | IdeaRoads wordmark — returns to the landing page                    |
| Docs        | Opens the documentation                                             |
| GitHub      | Opens the GitHub repository — shows the project's star count        |
| Sign In     | Goes to the sign-in flow — right-aligned, outlined button           |
| Get Started | Goes to the sign-up / sign-in flow — right-aligned, filled primary button |

The bar is sticky on scroll and collapses to an icon-only layout on mobile.

---

### 2. Hero Section

**Headline:**

> Open-source customer feedback, built to close the loop.

**Subheadline:**

> Collect feedback, vote on what matters, plan a roadmap, ship it, and notify your users — all in one self-hosted platform.

**Calls to action:**

- Primary: **Get Started Free** — begins the sign-up flow.
- Secondary: **View on GitHub** — opens the GitHub repository.

**Visual:** A browser mockup showing the public board view — a post list with vote counts and status badges — presenting the core product in a single frame. Alternatively, a clean illustration of the closed-loop diagram.

**Trust signals (below the CTAs):**

- MIT-licensed.
- "Self-hosted — you own your data."
- "Voters always free."

---

### 3. The Closed Loop

**Section title:** The product in one loop

A horizontal flow diagram with an icon for each step:

```
Collect → Vote → Plan → Ship → Announce → Notify
   ↑                                          |
   └──────────────────────────────────────────┘
```

**Copy beneath each step:**

| Step     | Copy                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| Collect  | Users submit feature requests and bug reports to your public boards          |
| Vote     | Votes surface what matters most — one per user, no gaming                    |
| Plan     | Voted posts auto-populate your public roadmap by status                      |
| Ship     | The team marks a post Completed when it's done                               |
| Announce | Write a changelog entry linked to the shipped feedback                       |
| Notify   | Every voter automatically gets an email when you ship                        |

**Closing line:**

> Any single piece is a commodity. The integration is what makes it sticky.

---

### 4. Features Grid

Six cards — one per core feature group. Each card has an icon, a feature name, and a one-line description.

| Feature             | Description                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Feedback Boards     | Multiple boards per workspace. Public by default. Up to 10 active boards.                |
| Voting              | One vote per signed-in User. Vote counts drive sort order.                               |
| Public Roadmap      | Auto-generated from post statuses. No manual curation. Three columns.                    |
| Changelog           | Write release notes, link shipped posts, and notify all voters on publish.               |
| Team Roles          | Brand Admin (manages the workspace), Team Member (helps manage feedback), User (votes and comments). |
| Email Notifications | Four trigger events. Per-workspace preferences. One-click unsubscribe.                   |

---

### 5. Who It's For

Three cards, each with a persona, a description, and the pain it solves.

| Persona                 | Description                                        | Pain it solves                                                             |
| ----------------------- | -------------------------------------------------- | -------------------------------------------------------------------------- |
| **Startups**            | Building your first structured feedback channel    | Feedback scattered across email, Notion, and DMs                           |
| **Indie Makers**        | Solo or small OSS projects with active communities | No affordable way to manage community requests without a SaaS subscription |
| **Small Product Teams** | 2–25 people replacing ad-hoc boards                | Feature-request tracking in Trello is manual; Canny charges per voter      |

---

### 6. Open Source & Self-Hosted

**Section title:** You own your data. Always.

Three pillars:

| Pillar      | Headline                    | Body                                                                            |
| ----------- | --------------------------- | ------------------------------------------------------------------------------- |
| Open Source | MIT Licensed                | Read the code, fork it, contribute to it. No black boxes.                       |
| Self-Hosted | One command to deploy       | Runs on your own server. Your data never leaves your infrastructure.            |
| Free Voters | Voters don't cost you money | Pricing (post-MVP cloud tier) is per team seat only. End users are always free. |

---

### 7. Comparison Table

A simple feature comparison — IdeaRoads vs Canny vs Upvoty — focused on the three differentiators.

|                                    | IdeaRoads | Canny                 | Upvoty        |
| ---------------------------------- | --------- | --------------------- | ------------- |
| Open source                        | ✓         | —                     | —             |
| Self-hosted                        | ✓         | —                     | —             |
| Voters always free                 | ✓         | —                     | —             |
| Public roadmap                     | ✓         | ✓                     | ✓             |
| Changelog with voter notifications | ✓         | ✓                     | ✓             |
| Email notifications                | ✓         | ✓                     | ✓             |
| One-click self-host                | ✓         | —                     | —             |
| Pricing                            | Free      | Paid per seat + voter | Paid per seat |

**Footnote:** The Canny and Upvoty comparison is based on their publicly documented plans. IdeaRoads is not affiliated with either.

---

### 8. Quick Start

**Section title:** Up and running in under 5 minutes

A short, three-step walkthrough that shows how quickly a visitor can self-host IdeaRoads: clone the repository, configure the environment, and start the stack. The exact commands are shown in a copyable code block.

**Call to action below:** "Full self-hosting guide →" links to the documentation.

---

### 9. Footer

| Column     | Links                                                              |
| ---------- | ----------------------------------------------------------------- |
| Product    | Features, Roadmap (IdeaRoads's own), Changelog (IdeaRoads's own)  |
| Developers | Documentation, GitHub, Contributing                               |
| Legal      | MIT License, Privacy Policy (post-MVP)                            |
| Social     | GitHub star count, Twitter/X (post-MVP)                           |

**Bottom bar:**

> Built with IdeaRoads. © 2026 IdeaRoads contributors. MIT License.

---

## Edge Cases

| Case                                     | Behaviour                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| A signed-in person visits the landing page | The navigation shows "Dashboard" instead of "Sign In"; clicking it goes to onboarding or their last workspace |
| The GitHub star count is unavailable     | No star badge is shown — the page never breaks because the count is missing                               |
| A visitor has JavaScript disabled        | All content is still readable; only interactive niceties (such as the mobile nav toggle) degrade gracefully |
| Dark mode                                | The landing page follows the visitor's system colour-scheme preference                                    |
| Slow connection                          | The hero visual loads progressively and the page remains usable                                           |

---

## Acceptance Criteria

- [ ] The landing page is reachable without signing in.
- [ ] The page is fully readable with JavaScript disabled.
- [ ] Every navigation link works (Logo, Docs, GitHub, Sign In, Get Started).
- [ ] The "Get Started Free" call to action begins the sign-up flow.
- [ ] The "View on GitHub" call to action opens the correct GitHub repository.
- [ ] The closed-loop diagram is visible without scrolling on a standard desktop viewport.
- [ ] The comparison table is readable on mobile with no horizontal scrolling.
- [ ] The quick-start commands are copyable.
- [ ] The page has a descriptive title and meta description, and a social-sharing preview image.
- [ ] The page is fast (90+ Lighthouse Performance on desktop).
- [ ] No footer link is broken.
