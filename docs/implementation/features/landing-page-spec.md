# Implementation — Landing Page Design Spec

> Implementation reference for the Landing Page design spec. Product/marketing brief: ../../LANDING-PAGE-SPEC.md

This document holds the technical detail and design-token values removed from the product/marketing brief. Schema and platform-wide tech choices live in their own references and are not duplicated here.

---

## Design Tokens

All implementation must use these tokens exclusively. No hardcoded colors.

| Token | Usage |
|---|---|
| `bg-primary` | Dark section backgrounds (hero, quick start) |
| `text-primary-foreground` | Text on dark sections |
| `bg-background` | White section backgrounds |
| `bg-muted` | Light gray section backgrounds |
| `bg-card` | Card backgrounds within muted sections |
| `text-foreground` | Primary text on light sections |
| `text-muted-foreground` | Secondary/body text on light sections |
| `border-border` | All borders |
| `text-success` | Eyebrow labels and accent moments only (emerald) |
| `bg-destructive` | Not used on landing page |

Border radius: `--radius: 0rem` — zero radius throughout. No rounded corners anywhere.
Shadows: None. Separation achieved through borders and background-color contrast.
Icons: Lucide React. Consistent `size-5` within cards and inline contexts.

The dark sections (Hero and Quick Start) use the same `bg-primary` as the app's sidebar, giving the visitor a visual preview of the product's aesthetic before signing up.

### Per-section background / border map

| Section | Background | Borders |
|---|---|---|
| Navigation | `bg-background` | `border-b border-border` |
| Hero | `bg-primary` (dark) | image: `border border-primary-foreground/15` |
| Trust Bar | `bg-muted` | `border-y border-border` |
| Key Differentiators | `bg-background` | cards: `border border-border` |
| Features Grid | `bg-muted` | cards: `border border-border` |
| The Closed Loop | `bg-background` | nodes: `border border-border` |
| Quick Start | `bg-primary` (dark) | code/panel: `border border-primary-foreground/15` |
| Footer | `bg-background` | `border-t border-border` |

---

## Typography Scale

| Role | Classes | Notes |
|---|---|---|
| Hero H1 | `font-black text-5xl` (mobile) `text-7xl` (desktop) | Against dark bg: `text-primary-foreground`. `max-w-3xl` |
| Section heading | `font-bold text-3xl` (mobile) `text-4xl` (desktop) | Quick Start uses `font-black` to match hero |
| Section eyebrow | `text-xs font-bold uppercase tracking-eyebrow text-success` | Emerald only |
| Section subtext | `text-lg leading-8 text-muted-foreground` (light) `text-primary-foreground/70` (dark) | |
| Card title | `font-semibold text-base text-foreground` | |
| Card body | `text-sm leading-6 text-muted-foreground` | |
| Code block | `font-mono text-sm` | |
| Footer heading | `font-medium text-sm text-foreground` | |
| Footer link | `text-sm text-muted-foreground` | Hover: `text-foreground` |
| Bottom bar | `text-xs text-muted-foreground` | |

---

## Components

```
components/marketing/
├── nav.tsx                     Navigation — sticky navigation bar
├── hero.tsx                    Hero — dark hero section
├── trust-bar.tsx               Trust Bar — horizontal trust signals
├── differentiators.tsx         Key Differentiators — three OSS/self-hosted/free-voters cards
├── features-grid.tsx           Features Grid — six feature cards + inline CTA
├── loop-diagram.tsx            The Closed Loop — six-node closed loop + closing quote
├── quick-start.tsx             Quick Start — dark three-step section + final CTA
├── footer.tsx                  Footer — footer columns + bottom bar
└── cta-button.tsx              Shared — CTA button used across sections
```

Components in `components/marketing/` are isolated from app components in `components/ui/`, `components/boards/`, etc. They import from `components/ui/` but are never imported by app components.

### Icon assignments (Lucide React)

| Context | Icons |
|---|---|
| Trust Bar signals | `Scale`, `Github`, `Server`, `Star`, `Users`, `Package` (`size-4`) |
| Differentiator cards | `Scale`, `Server`, `Users` (`size-8`, `text-foreground`) |
| Feature cards | `LayoutGrid`, `ChevronUp`, `Columns3`, `Megaphone`, `Users`, `Bell` (`size-5`) |
| Hero / nav GitHub CTA | `Star` (`size-4`) |
| Quick Start code blocks | `Copy` (`size-4`) |

### Component element details

- **Nav GitHub star count** — fetched at build time via `fetch` with `next: { revalidate: 3600 }`. On fetch failure: render "GitHub" without the count; do not crash. Show nothing in the count slot rather than a spinner so the nav does not jank. Star count in the Trust Bar is sourced from the same build-time fetch.
- **Nav scroll state** — on scroll past hero, nav gains `bg-background/95 backdrop-blur-sm` for legibility. Border only — no shadow. Height `h-16` (64px). Container `max-w-6xl mx-auto px-8`.
- **Hero screenshot** — static `next/image` of the public board view. `next/image` `alt`: "IdeaRoads public feedback board — showing post list with vote counts and status badges". On error, an `onError` handler hides the image container entirely (no broken-image icon). At MVP a structured HTML/CSS mockup using real design-system components (`Card`, `Badge`, vote indicators) is acceptable; a grey rectangle is not.
- **Trust Bar separators** — single `·` character or a `1px` vertical `border-r border-border` divider, `h-4`. Decorative; not rendered between wrapped items on mobile. Signal items: `flex items-center gap-2 text-sm font-medium text-muted-foreground`.
- **Closed-loop connectors** — `→` / right-pointing chevron rendered as a thin `1px` horizontal line with an arrowhead, color `border-border`, via CSS/border (no SVG, no diagram library). Desktop uses `::after` pseudo-elements or a thin horizontal-line overlay between grid columns.
- **Loop-back visual** — a `div` styled with `border-b border-l border-r border-border` to form a U-shape beneath the node row (`mt-4`), spanning the full diagram width. Pure CSS, no SVG. Not rendered on mobile (replaced by the caption text).
- **Node container** — `bg-card border border-border p-4`, equal width across all six. Step number `font-mono text-xs text-muted-foreground`.
- **Closing quote** — `blockquote`, `text-xl font-semibold text-foreground text-center` (`text-lg` on mobile), `max-w-2xl mx-auto`. No decorative quotation-mark glyph.
- **Quick Start code blocks** — `bg-primary-foreground/5 border border-primary-foreground/15`; code text `font-mono text-sm text-primary-foreground`; comment lines `text-primary-foreground/40`. `Copy` button top-right copies the command; not rendered when JS disabled (`suppressHydrationWarning`); always visible (not hover-only) on mobile for touch targets.
- **Quick Start "What's included" panel** — `bg-primary-foreground/5 border border-primary-foreground/15 p-8`, title "What's included", lists: "PostgreSQL + Drizzle", "Better Auth (Magic Link + Google)", "pg-boss job queue", "Email via SMTP", "platform admin panel". On mobile rendered below steps; optional via `hidden sm:block`.
- **CTA button rendering on dark sections** — primary renders as light/white (`bg-primary-foreground text-primary`); outline/secondary render as outlined/light buttons on dark.

---

## Responsive Breakpoints

| Section | Desktop layout | Mobile layout |
|---|---|---|
| Navigation | wordmark left, Docs + GitHub center-right, Sign In + Get Started right; sticky `h-16`; `max-w-6xl mx-auto px-8` | wordmark left, Get Started only; other links hidden; no hamburger at MVP; same sticky `h-16` |
| Hero | two-column `grid-cols-2 gap-16 items-center` (left ~55%, right ~45%); `pt-24 pb-20 px-8`; H1 `text-7xl` | single column stacked; screenshot full-width `mt-10`; `pt-20 pb-16 px-4`; H1 `text-5xl`; CTAs `flex-col` on `xs`, `flex-row flex-wrap` from `sm` |
| Trust Bar | `flex items-center justify-center gap-8 flex-wrap`; `max-w-6xl mx-auto px-8 py-6`; one row ≥1024px | `flex flex-wrap justify-center gap-x-6 gap-y-3` (2×3 / 3×2); no separators; `py-5 px-4` |
| Key Differentiators | `grid grid-cols-3 gap-6 mt-12`; `py-20 px-8`; cards `p-6` | `grid grid-cols-1 gap-4`; `py-16 px-4`; cards `p-5` |
| Features Grid | `grid grid-cols-3 gap-6 mt-12`; `py-20 px-8`; inline CTA centered `mt-12` | `grid grid-cols-1 gap-4`; cards `p-5`; CTA `w-full max-w-xs`; `py-16 px-4` |
| The Closed Loop | `grid grid-cols-6 gap-3`; `py-20 px-8`; quote `mt-16 max-w-2xl mx-auto` | `grid grid-cols-2 gap-3`; loop-back becomes caption; quote `text-lg`; `py-16 px-4` |
| Quick Start | two-column (steps ~60%, panel ~40%); `py-24 px-8` | single column; panel below steps (`hidden sm:block` optional); code blocks full-width; CTA `w-full max-w-xs`; `py-20 px-4` |
| Footer | `bg-background border-t border-border`; `pt-16 pb-8 px-8`; `grid grid-cols-4 gap-12` (logo/tagline col 1, links cols 2–4) | logo/tagline full width `mb-8`; links `grid grid-cols-3 gap-4`; `grid-cols-1` under 375px; bottom bar centered; `pt-12 pb-6 px-4` |

Footer column headings: `font-medium text-sm text-foreground mb-4`. Footer links: `block text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 py-1`.

Acceptance constraint: no horizontal scroll on any section at 375px viewport width (exception: Quick Start code blocks may scroll horizontally on very long commands). Loop diagram renders all 6 nodes in a horizontal row on desktop ≥ 1280px.

---

## SEO / Metadata

Implemented via `generateMetadata()` in `app/(marketing)/page.tsx` or `app/layout.tsx`.

| Field | Value |
|---|---|
| `<title>` | `IdeaRoads — Open-source customer feedback & feature voting` |
| `<meta name="description">` | `Self-hosted feedback boards, voting, public roadmap, and changelog. MIT licensed. Deploy in 5 minutes with Docker.` |
| `og:title` | Same as `<title>` |
| `og:description` | Same as `<meta description>` |
| `og:image` | `/public/og-image.png` — a 1200×630 static social card. At MVP, a plain dark card with the IdeaRoads wordmark and tagline. Do not use the product screenshot — too small to be legible at social-card dimensions. |
| `twitter:card` | `summary_large_image` |
| `twitter:title` | Same as `og:title` |
| `twitter:description` | Same as `og:description` |

---

## Build & Deploy

### Route structure

```
app/
├── page.tsx                    → if authenticated: redirect("/post-auth")
│                                 if not: render landing page sections inline
│                                 OR: redirect to (marketing)/page.tsx
└── (marketing)/
    ├── layout.tsx              → Nav + Footer components only. No auth context. No sidebar.
    └── page.tsx                → export const dynamic = 'force-static'. All 8 sections.
```

The `(marketing)` route group isolates the landing page from the workspace and auth route groups. No middleware applies to it. No session checks except the redirect-if-authenticated case in `app/page.tsx`.

### Quick Start commands (shown in Section: Quick Start)

```
git clone GITHUB_REPO_URL
```

```
cp .env.example .env
# Edit DATABASE_URL, BETTER_AUTH_SECRET, and SMTP_HOST
```

```
docker compose up -d
# App runs at http://localhost:3000
```

### Config — `config/platform.ts` required additions

These constants must be added before implementation begins; they do not exist yet.

```
GITHUB_REPO_URL       — the full GitHub URL for the IdeaRoads repository
DOCS_URL              — the documentation URL (GitHub docs folder or external docs site)
PRODUCT_NAME          — update from "IDEA ROADS" to "IdeaRoads" (mixed case)
PRODUCT_DESCRIPTION   — update to:
                        "Open-source customer feedback, voting, and changelog. Self-hosted. MIT licensed."
```

Footer link destinations: Documentation → `DOCS_URL`; GitHub → `GITHUB_REPO_URL`; Contributing → `GITHUB_REPO_URL/blob/main/CONTRIBUTING.md`; MIT License → `GITHUB_REPO_URL/blob/main/LICENSE`. At MVP, footer Roadmap and Changelog links point to the GitHub repo until IdeaRoads uses its own product for these pages. Privacy Policy is post-MVP (omit or mark "Coming soon" in `text-muted-foreground/40`).

---

## Technical Notes

- **Auth routing** — an authenticated visitor to `/` is redirected to `/post-auth`, which routes them to their workspace (`/{slug}`), Orbit (if Platform Admin), or onboarding. Both nav CTAs ("Get Started" and "Sign In") link to `/signin`; the auth layer handles new vs. returning users. The Sign In link is intentionally omitted from the mobile nav.
- **SSR / no-JS** — page is fully SSR and renders completely with JavaScript disabled. CTAs are plain anchor tags wrapped in Next.js `Link`. The copy-to-clipboard button is the only interactive element and degrades gracefully (not rendered when JS is disabled).
- **External links** — "View on GitHub" and other GitHub links open in a new tab.
- **Performance** — target ≥ 90 on Lighthouse Performance (desktop).

### Acceptance criteria (technical)

- [ ] Page renders at `/` without authentication
- [ ] Authenticated user is redirected to `/post-auth` on visiting `/` (routes to workspace, Orbit, or onboarding)
- [ ] Page renders correctly with JavaScript disabled (full SSR)
- [ ] All nav links are functional: wordmark, Docs, GitHub, Sign In, Get Started
- [ ] GitHub star count renders when fetch succeeds; "GitHub" renders without count when fetch fails
- [ ] Hero screenshot renders. Alt text is set correctly
- [ ] Trust bar renders all 6 signals on desktop in a single row
- [ ] All three differentiator cards render with correct copy
- [ ] All six feature cards render with correct icons, titles, and descriptions
- [ ] Loop diagram renders all 6 nodes in a horizontal row on desktop ≥ 1280px
- [ ] Loop diagram renders in a 2×3 grid on mobile
- [ ] Loop-back caption renders on mobile
- [ ] Closing quote renders below the loop diagram on all viewports
- [ ] All three Quick Start code blocks render correctly
- [ ] Copy-to-clipboard button is present on each code block
- [ ] Final CTA and "Full self-hosting guide →" link render below Quick Start steps
- [ ] Footer renders all 3 link columns and bottom bar
- [ ] No broken links anywhere on the page
- [ ] `<title>` and `<meta description>` are set correctly
- [ ] `og:image` is set
- [ ] Page scores ≥ 90 on Lighthouse Performance (desktop)
- [ ] No horizontal scroll on any section at 375px viewport width (exception: Quick Start code blocks may scroll on very long commands)
</content>
</invoke>
