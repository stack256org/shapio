# Implementation — Feature 00: Landing Page

> Implementation reference for Feature 00 — Landing Page. Product behaviour: ../../features/00-landing-page.md

This document holds the technical detail removed from the product spec.

---

## Rendering

- Route group: `app/(marketing)/page.tsx` — isolated from the `(workspace)` and `(auth)` route groups so no auth middleware leaks in.
- Layout: `app/(marketing)/layout.tsx` — contains `<Nav>` and `<Footer>` only; no sidebar, no workspace context, no auth context.
- Fully server-side rendered. Use `export const dynamic = 'force-static'` on `app/(marketing)/page.tsx` to ensure static generation at build time.
- No `"use client"` on the page itself; renders without JavaScript. Only interactive elements (mobile nav toggle) may degrade gracefully when JS is disabled.
- No authentication check — this route is always public.
- Do NOT use `<LocalDate />` (a client component) anywhere on this page — no dynamic timestamps.
- Hero mockup/screenshot: use a static image (`public/screenshots/board-view.png`) — do not embed a live iframe of the app. Lazy-load the image, or fall back to a pure CSS/HTML diagram at MVP.

---

## Components

```
app/
└── (marketing)/
    ├── layout.tsx                  # Nav + Footer only, no auth context
    └── page.tsx                    # Landing page — force-static SSR

components/
└── marketing/
    ├── nav.tsx                     # Top navigation bar
    ├── hero.tsx                    # Hero section
    ├── loop-diagram.tsx            # Collect → Vote → Plan → Ship → Announce → Notify
    ├── features-grid.tsx           # Six feature highlight cards
    ├── who-its-for.tsx             # Three ICP cards
    ├── open-source-section.tsx     # OSS / self-hosting pitch
    ├── comparison-table.tsx        # IdeaRoads vs Canny vs Upvoty
    ├── quick-start.tsx             # Docker Compose command + steps
    ├── footer.tsx                  # Footer with links
    └── cta-button.tsx              # Shared CTA button component
```

- `components/marketing/` is a separate directory from `components/ui/` and `components/boards/` — keeps landing-page components isolated from app components.
- All imports use the `@/` path alias — never relative paths.
- The comparison-table data (Canny, Upvoty) is hardcoded in the component — it does not come from a CMS or DB.

---

## SEO / Metadata

- `generateMetadata()` returns the page title, description, `og:image`, and `twitter:card`.
- `og:image` is set for social-sharing previews.
- Acceptance: `<title>` and `<meta description>` are populated via `generateMetadata()`; `og:image` is present.

---

## Config

**`config/platform.ts`**

```ts
export const PRODUCT_NAME = "IdeaRoads"
export const GITHUB_REPO_URL = "..."   // GitHub repository URL
export const DOCS_URL = "..."          // Documentation URL
```

- All product-level constants live in `config/platform.ts` — never hardcoded in components.
- All CTAs link to `/signin` or `GITHUB_REPO_URL` from `config/platform.ts`.

---

## GitHub Star Count (build-time fetch)

- The GitHub star count is fetched at build time via a build-time `fetch` with `next: { revalidate: 3600 }` (or `generateStaticParams`).
- No runtime API calls — the page is otherwise fully static and reads no database.
- If the build-time fetch fails, `try/catch` it and show no badge rather than crashing the build.

---

## Quick-Start Code Block

The quick-start section renders the following copyable steps:

```
1.  Clone the repo
    git clone https://github.com/[org]/idearoads.git

2.  Configure your environment
    cp .env.example .env
    # Fill in DATABASE_URL, BETTER_AUTH_SECRET, SMTP_HOST

3.  Start the stack
    docker compose up -d
    # App runs at http://localhost:3000
```

- Step 2 references `BETTER_AUTH_SECRET` (not `APP_SECRET`) — consistent with `.env.example`.

---

## Technical Notes

- Tailwind `dark:` variants handle dark mode — no JS theme toggle needed at MVP. The page respects the system `prefers-color-scheme`.
- The nav is sticky on scroll. No hamburger menu at MVP — it collapses to icon-only on mobile.
- Lighthouse target: 90+ Performance (desktop).

### Events / Background Jobs

None. The landing page emits no domain events, subscribes to none, and runs no background jobs.

### Dependencies

| Dependency                   | Reason                                                      |
| ---------------------------- | ----------------------------------------------------------- |
| `config/platform.ts`         | `PRODUCT_NAME`, `GITHUB_REPO_URL`, `DOCS_URL` constants     |
| `app/(marketing)/layout.tsx` | Isolated layout — no workspace context, no auth context     |
| `/signin` route              | Primary CTA destination                                     |
| GitHub API (build-time only) | Optional: fetch star count at build time with `revalidate`  |
