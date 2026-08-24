# IdeaRoads — Landing Page Specification

> The product and marketing brief for the IdeaRoads landing page — the public home page at `/`.
> This document describes **what the page says and why** — its purpose, messaging, sections, and conversion goal. It supersedes the section descriptions in [`features/00-landing-page.md`](features/00-landing-page.md).
> For implementation reference (design tokens, components, breakpoints, SEO, build & deploy), see [`implementation/features/landing-page-spec.md`](implementation/features/landing-page-spec.md).

---

## Purpose

The landing page is **Public** — reachable without signing in. Its audience is anonymous visitors: people discovering IdeaRoads for the first time, many arriving from GitHub. The page's job is to turn a curious visitor into a prospective Brand Admin who clicks **Get Started** and creates a workspace.

The single conversion goal is **drive sign-ups.** Every section either moves the visitor toward that decision or removes an objection that would stop it. An authenticated visitor never sees the marketing page — they are routed straight into the product.

The page must feel clean, professional, and premium, and it must be fully mobile-responsive. The dark hero and quick-start sections bookend the page intentionally: they share the product's own visual aesthetic, so the visitor previews what they are signing up for before they ever click.

---

## Section Order

The page flows as a deliberate persuasion sequence — comprehension first, then legitimacy, then differentiation, then proof, then activation:

1. **Navigation** — persistent wayfinding and an always-present sign-up route
2. **Hero** — what IdeaRoads is, in five seconds
3. **Trust Bar** — quick legitimacy signals
4. **Key Differentiators** — why IdeaRoads is different
5. **Features Grid** — what you actually get
6. **The Closed Loop** — how it all fits together
7. **Quick Start** — how easy it is to run
8. **Footer** — navigation for visitors leaving or researching

---

## Section 1 — Navigation

### Intent

First contact. Within about two seconds, before reading any copy, the visitor checks: is this a real project, is there a GitHub link, can I sign in? The nav signals legitimacy through presence and consistency, and gives high-intent visitors an immediate escape route to act without reading the page.

### Content

- **Wordmark (left):** the IdeaRoads name, treated as the logo itself — no separate logomark at MVP. Links back to the home page.
- **Discovery links (desktop):** Documentation, and a GitHub link showing the live star count. If the count is unavailable, the link still reads "GitHub" — it never breaks.
- **Actions (right):** **Sign In** (secondary) and **Get Started** (primary). Both lead to the same sign-in route; the product sorts out new versus returning visitors.

On mobile the nav simplifies to the wordmark plus a single **Get Started** button; returning visitors are routed correctly from there. The nav stays visible as the visitor scrolls.

### CTA

- Primary: **Get Started**
- Secondary: **Sign In**

---

## Section 2 — Hero

### Intent

Establish what IdeaRoads is within five seconds and answer the three silent questions of every first-time visitor: What is this? Is it for me? What does it cost? At this stage the goal is comprehension, not conversion — create enough understanding and desire to keep the visitor scrolling, or enough intent to click immediately.

### Content

- **Eyebrow:** `OPEN SOURCE · SELF-HOSTED · MIT LICENSE` — three credibility claims, the very first thing the visitor reads, set as a warm accent against the dark background.
- **Headline:** *Open-source customer feedback, built to close the loop.* This is the approved product headline.
- **Subheadline:** *Collect feedback, vote on what matters, plan a roadmap, ship it, and notify your users — all in one self-hosted platform.* It states all six loop steps in plain prose, priming the visitor for "The Closed Loop" section later.
- **Product preview:** a screenshot of the public feedback board — a list of posts with vote counts, status badges (Open, Planned, In Progress), category chips, and a filter/sort bar — so the visitor sees what the product looks like. If a real screenshot is unavailable at MVP, a faithful mockup built from real product components is used; a blank placeholder is never acceptable.

### CTA

- Primary: **Get Started Free** — the first conversion moment, with the "Free" label answering the cost question directly.
- Secondary: **View on GitHub** (with star count) — opens the repository.

---

## Section 3 — Trust Bar

### Intent

Immediately reduce the skepticism that follows a strong headline. Before reading features or comparisons, the visitor applies a quick legitimacy filter: is this real, maintained, and actually free, or will it be abandoned? This section validates rather than sells.

### Content

A single quiet row of trust signals — no headings, no body copy, the signals speak for themselves:

- **MIT License**
- **Open Source**
- **Self-Hosted**
- **GitHub Stars** (live count)
- **Voters Always Free** — there is no per-voter pricing
- **One-command Deploy**

### CTA

None — by design. A CTA here would interrupt the legitimacy-building moment.

---

## Section 4 — Key Differentiators

### Intent

Establish *why* IdeaRoads is different before showing *what* it does. Features can be matched on a spreadsheet; differentiators cannot. This section pre-empts the objection every visitor who has used a hosted alternative carries: "How is this actually different, and what's the catch — nothing is really free?"

### Content

- **Eyebrow:** `WHY DIFFERENT`
- **Heading:** *You own your data. Your voters are free.* — two of the three core differentiators stated as fact, not as a marketing claim.
- **Subtext:** *No vendor lock-in. No per-voter pricing. No cloud account required.*

Three pillar cards:

1. **MIT Licensed** — Read the code, fork it, contribute to it. No black boxes, no proprietary lock-in. The license is permanent — not a "source available" bait-and-switch.
2. **Self-Hosted** — Runs on your own server with a single command. Your feedback data never leaves your infrastructure.
3. **Voters Always Free** — The customers using your feedback boards never cost you a seat. Some hosted tools charge per voter. IdeaRoads doesn't, and never will.

The third card calls out per-voter pricing of hosted competitors directly and matter-of-factly — specific language converts better than vague claims, without being aggressive.

### CTA

None — this section builds conviction; the natural CTA follows once features are understood.

---

## Section 5 — Features Grid

### Intent

Prove feature parity with paid alternatives and give practically-minded visitors the concrete capability checklist they need to decide. The visitor is running their personal requirements list against the product — this is a fast scan, where the card titles do the work and the body copy confirms.

### Content

- **Eyebrow:** `WHAT YOU GET`
- **Heading:** *Six capabilities. All working together.*

Six feature cards:

1. **Feedback Boards** — Multiple boards per workspace, each public or private. Up to ten active boards per workspace.
2. **Voting** — One vote per signed-in User. Vote counts drive sort order.
3. **Public Roadmap** — Generated automatically from post statuses, with no manual curation. Posts move between columns as their status changes.
4. **Changelog** — Write release notes, link the shipped feedback, and notify every voter automatically on publish.
5. **Team Roles** — Brand Admins and Team Members run the workspace together. Invite people by email or a shareable link; role changes take effect immediately.
6. **Email Notifications** — For status changes, comments, replies, and new changelog entries. Per-workspace preferences with one-click unsubscribe.

### CTA

- Inline: **Get Started Free** — the first CTA below the fold. It sits after the features grid because this is the first point where the visitor has enough information to decide; higher-intent visitors convert here, others keep scrolling.

---

## Section 6 — The Closed Loop

### Intent

Differentiate through product architecture. Competitors also have boards, voting, and changelogs, but IdeaRoads frames these six capabilities as a deliberate closed loop — where the last step (Notify) feeds back into the first (Collect). This section is for visitors who are already interested and want to understand how the system works end to end: "If I ship a feature, will the people who asked for it actually get told?"

### Content

- **Eyebrow:** `THE FULL PICTURE`
- **Heading:** *Any tool can collect feedback. Only IdeaRoads closes the loop.*

A six-step loop, with a visible return path connecting the last step back to the first to make the "loop" literal rather than metaphorical:

| # | Step | What happens |
|---|---|---|
| 01 | Collect | Users submit feature requests and bug reports to your public boards |
| 02 | Vote | Votes surface what matters most — one per User, no gaming |
| 03 | Plan | Voted posts auto-populate your public roadmap by status |
| 04 | Ship | The team marks a post Completed when the work is done |
| 05 | Announce | Write a changelog entry linked to the shipped feedback |
| 06 | Notify | Every voter automatically gets an email when you ship |

- **Closing line:** *"Any single piece is a commodity. The integration is what makes it sticky."*

The return path from step 06 back to step 01 is the most important visual element here — it is what makes the closed-loop idea concrete.

### CTA

None — this is a moment of comprehension for visitors who are already convinced. The final CTA lives in the next section.

---

## Section 7 — Quick Start

### Intent

Remove the last objection: "Is this too hard to set up?" This is the activation threshold. Make deployment feel immediate and concrete — minimal effort, without overstating what is required — so visitors who reach this point with remaining intent leave confident enough to click.

### Content

- **Eyebrow:** `QUICK START`
- **Heading:** *One command. Your own server.* — a confident, declarative statement.
- **Subtext:** *No cloud account. No credit card. No vendor.* — directly neutralizing the three implicit objections at this stage.

Three plainly numbered steps walk the visitor through getting IdeaRoads running on their own server:

1. **Clone the repo**
2. **Configure your environment**
3. **Start the stack**

Each step shows the exact command to run, with a one-tap copy action. A supporting callout summarizes what a deployment includes (database, authentication with magic link and Google, a background job queue, email, and the platform admin area) so the visitor knows what they are getting.

A secondary text link, **Full self-hosting guide →**, points to the documentation for visitors who want the complete walkthrough.

### CTA

- Primary: **Get Started Free** — the final conversion moment, after the activation cost has been addressed.
- Secondary: **Full self-hosting guide →** — to the documentation.

---

## Section 8 — Footer

### Intent

Provide navigation for visitors who reached the end without converting — either researching before deciding, or leaving. Neither group needs more marketing copy. The footer also signals that IdeaRoads is a genuine, maintained project (docs, contributing guide, license) rather than an abandoned prototype.

### Content

- **Brand block:** the IdeaRoads wordmark with the tagline *Open-source customer feedback. Self-hosted. MIT licensed.*
- **Product:** Features, Roadmap, Changelog. (At MVP, Roadmap and Changelog point to the project's GitHub until IdeaRoads runs these pages on its own product.)
- **Developers:** Documentation, GitHub, Contributing.
- **Legal:** MIT License, and Privacy Policy (post-MVP).
- **Bottom bar:** *Built with IdeaRoads. © 2026 IdeaRoads contributors. MIT License.*

### CTA

None — the footer is navigation, not a conversion surface.

---

## CTA Placement Summary

The page carries a single, repeated primary action — **Get Started** — placed at each natural decision point, all leading to sign-up:

| Position | Section | Button | Why here |
|---|---|---|---|
| 1 | Navigation (persistent) | Get Started | Impulse — always visible |
| 2 | Hero | Get Started Free | First conversion moment |
| 3 | Features Grid (inline) | Get Started Free | After the feature scan |
| 4 | Quick Start (final) | Get Started Free | After the activation cost is addressed |

Supporting secondary actions: **View on GitHub** (Hero) and **Full self-hosting guide →** (Quick Start), for visitors who want to inspect the project or read the docs before committing.
</content>
