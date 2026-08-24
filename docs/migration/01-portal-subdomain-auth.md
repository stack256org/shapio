# Migration Plan — Independent Workspace & Public Portal (Subdomain Split)

Status: **Phase 0 + Phase 1 IMPLEMENTED & VERIFIED.** Phase 1.5 (Google on the
portal host) and Phase 2 (custom domains) deferred — see §8.

## What shipped (Phase 0 + Phase 1)

- `lib/urls.ts` — `adminBaseUrl()` / `portalBaseUrl()` (+ `adminHost()`,
  `portalHost()`, `hostsSplit()`); `lib/env.ts` — optional `NEXT_PUBLIC_ADMIN_URL`
  / `NEXT_PUBLIC_PORTAL_URL` defaulting to `NEXT_PUBLIC_APP_URL`.
- Every absolute-URL builder now targets the correct host (full audit in §7).
- `middleware.ts` — host-aware routing: portal host serves only Public Portal
  pages (+ auth screens); admin routes on the portal host and portal routes on
  the admin host redirect to the correct host; unknown hosts (e.g. bare
  `localhost`) fall back to single-origin behavior.
- `lib/auth.ts` — `trustedOrigins` = both hosts; magic-link verification URL is
  rewritten to the host the user signed in from → the session cookie is set on
  that host only. Cookies are **host-only** (no `Domain=`), which is the
  isolation guarantee.
- `app/(auth)/signin/page.tsx` — Google sign-in is offered on the admin host
  only for now (Phase 1.5 enables it on the portal host).

Verified: host routing (all cases), magic-link → portal host, session
`Set-Cookie` has no `Domain=` (host-scoped), and typecheck/lint/tests(81)/build
all green.

---

## Original plan (for reference)

Status of original draft below: **superseded by "What shipped" above.**

Goal: make the Workspace/Admin app and the Public Portal two independent
application contexts with **separate authentication sessions**, like Upvoty.
Logging into one must not authenticate the other.

---

## 0. The core insight (why this is achievable cleanly)

Browser cookies are isolated **by host** when they are set *host-only* (no
`Domain` attribute). Better Auth sets host-only cookies by default (we do **not**
enable `crossSubDomainCookies`). Therefore:

- A session cookie set on `app.example.com` is **never sent** to
  `portal.example.com`, and vice-versa — even though it's the **same Next.js
  app, the same Better Auth instance, and the same cookie name**.
- So we do **not** need two auth systems, two cookie names, or DB changes to get
  session isolation. We need to **serve the two route groups on two hosts** and
  make sure each host only handles its own routes and its own login.

This is exactly how Upvoty/Canny isolate admin vs public boards: different hosts,
different cookie jars.

---

## 1. Target architecture

Single Next.js app + single Better Auth instance, served on **two hosts**:

| Host (prod example)        | Serves                                                                 |
|----------------------------|-----------------------------------------------------------------------|
| `app.example.com` (admin)  | Marketing, `(auth)`, onboarding, account, `(orbit)`, `(workspace)/[slug]/…` |
| `portal.example.com`       | `(public)/[slug]/…` only (board, post, roadmap, changelog, profile)   |

- **Phase 1 keeps `/{slug}` in the portal path** — e.g.
  `portal.example.com/acme/roadmap`. This means **every existing `(public)`
  route and every host-relative `/${slug}/…` link keeps working unchanged**;
  only the *host* changes. This is the low-risk path.
- **Phase 2 (optional, later):** per-workspace subdomains / custom domains
  (`acme.example.com/roadmap`, or a customer's own domain). This drops `/{slug}`
  from the path and needs middleware host→slug mapping + a DB column. Deferred.

Local dev mirrors this with `app.localhost:3000` and `portal.localhost:3000`.

---

## 2. Which routes move / how routing is enforced

**Nothing moves on disk.** The `(workspace)` and `(public)` route groups already
resolve to distinct concrete URLs (`/{slug}/feedback` vs `/{slug}/roadmap`, etc.
— verified, no path collisions). Today one host serves both groups; after the
split, **host-aware middleware decides which group a host may reach.**

New `middleware.ts` logic (runs before every request):

1. Read the `host` header; classify as **admin host** or **portal host** (from
   env config; unknown hosts → treat as admin or 404 per config).
2. **On the portal host**, allow only: `(public)` paths (`/{slug}`,
   `/{slug}/roadmap`, `/{slug}/changelog`, `/{slug}/changelog/[id]`,
   `/{slug}/b/…`, `/{slug}/profile`), `/signin` (portal login), `/api/auth/*`,
   `/api/posts/*` (vote/comment), `/api/changelog/*`, `/api/notifications/*`
   (follow/unread), static assets, `widget.js`. Any admin path
   (`/{slug}/feedback`, `/{slug}/settings/*`, `/{slug}/notifications`, `/orbit`,
   `/onboarding`, `/account`, marketing) → **redirect to the admin host** (same
   path) or 404.
3. **On the admin host**, portal-only paths (`/{slug}/roadmap`,
   `/{slug}/changelog`, `/{slug}/b/…`, `/{slug}/profile`) → **redirect to the
   portal host** so old links/bookmarks still land correctly.
4. Keep the existing auth-gate for `/orbit`, `/account`, `/onboarding`,
   `/post-auth`, `/invite/link` (admin host only).

The current middleware only does a cookie presence check on a few matcher paths;
it will be extended to also do host classification. The matcher must widen to see
all routes (or use a catch-all with internal allowlisting) — carefully, to avoid
running on static assets.

---

## 3. How authentication separates

- **One Better Auth instance, host-only cookies (unchanged default).** No
  `crossSubDomainCookies`, no `Domain` attribute → the `app.*` cookie and the
  `portal.*` cookie are separate browser entries. This *is* the isolation.
- **Login is per-host.** `/signin` served on the portal host sets the portal
  cookie; served on the admin host sets the admin cookie. The
  `/api/auth/[...all]` handler already works on any host (same app).
- **Logout is per-host** (Better Auth clears the current host's cookie only).
- **`trustedOrigins`** in Better Auth config must list **both** hosts.
- **Magic-link email** must point at the host that initiated sign-in. Today the
  callback URL is derived from a single base; we thread the initiating origin
  through so the emailed link returns to the correct host. (Clean, low-risk.)
- **Google OAuth is the one real wrinkle.** OAuth redirect URIs are fixed
  per-provider-client and Better Auth's `baseURL` is a single value, so a Google
  login *initiated on the portal host* would, by default, redirect back to the
  admin host and set the **admin** cookie — wrong context. Options:
  - **1a (recommended for Phase 1):** magic-link works on both hosts cleanly;
    keep **Google OAuth on the admin host only** initially (portal users use
    magic-link). Zero risk, ship fast.
  - **1b (Phase 1.5):** enable Google on both hosts — register both callback
    URIs in Google console **and** make Better Auth compute `baseURL`/callback
    from the current request host (dynamic base URL). More work + testing.
- **Same-origin API from the portal.** Voting/commenting/follow call
  `/api/posts/*`, `/api/changelog/*`, `/api/notifications/*`. Because the same
  app is served on the portal host, these are **same-origin on the portal host**
  and automatically send the **portal** cookie → correct identity. No CORS
  needed.

---

## 4. Local development

- Use `*.localhost`, which browsers resolve to loopback automatically:
  - Admin: `http://app.localhost:3000`
  - Portal: `http://portal.localhost:3000`
- `next dev` serves every host on the one port; the new middleware routes by
  host. Cookies on `app.localhost` vs `portal.localhost` are host-only →
  isolated, so you can verify the "two tabs, two sessions" behavior locally.
- Fallback if a browser/OS doesn't treat `*.localhost` as loopback: add to
  `/etc/hosts`: `127.0.0.1 app.localhost portal.localhost`, or use
  `app.lvh.me:3000` / `portal.lvh.me:3000` (public DNS → 127.0.0.1).
- `.env` (dev): `NEXT_PUBLIC_ADMIN_URL=http://app.localhost:3000`,
  `NEXT_PUBLIC_PORTAL_URL=http://portal.localhost:3000`.
- README/`.env.example` updated with the two-host setup and a one-liner.

---

## 5. Environment variables & DNS

**New env vars** (replaces the single `NEXT_PUBLIC_APP_URL`):

- `NEXT_PUBLIC_ADMIN_URL` — e.g. `https://app.example.com`
- `NEXT_PUBLIC_PORTAL_URL` — e.g. `https://portal.example.com`
- (Phase 2 only) `NEXT_PUBLIC_PORTAL_BASE_DOMAIN` for wildcard subdomains.
- Keep `NEXT_PUBLIC_APP_URL` as a temporary alias of the admin URL during
  migration so nothing breaks mid-rollout, then remove.

**DNS / TLS (prod):**

- A/CNAME records for `app.example.com` and `portal.example.com` → deployment.
- TLS cert covering both hosts (or a wildcard `*.example.com`).
- Add **both** domains to the hosting project (Vercel/etc.).
- **Google OAuth console:** add authorized redirect URI(s) for each host that
  may initiate Google login (`https://<host>/api/auth/callback/google`).
- (Phase 2) wildcard DNS `*.example.com` + wildcard cert for custom/per-workspace
  domains.

---

## 6. Database changes

- **Phase 1: none.** `user`, `session`, `account`, `verification`, workspace and
  membership tables are all unchanged. Host-only cookies do the isolation.
- **Phase 2 only (custom/per-workspace domains):** add
  `workspaces.portal_domain` (nullable, unique text) to map a host → workspace,
  plus a migration and a host-lookup path in middleware. Not needed for the core
  goal.

---

## 7. Existing functionality that must be updated (and could break)

Every absolute URL built from the old single `NEXT_PUBLIC_APP_URL` must now pick
the **correct host**. Inventory (from a full grep of the codebase):

**Must point at the PORTAL host:**
- `components/settings/embed-section.tsx` — `widget.js` src + embed snippet
  (embeds are public board/roadmap content).
- `app/(public)/[slug]/changelog/feed.xml/route.ts` — RSS channel + entry URLs.
- `app/(public)/[slug]/changelog/[entryId]/page.tsx` — OG `url`.
- `lib/comments/create.ts` — in-*email* post links to external recipients.
- `lib/worker/handlers/send-status-change-email.ts`,
  `send-new-post-alert.ts`, `send-changelog-email.ts` — email links to the
  public post/changelog.
- `app/(workspace)/[slug]/settings/general/_components/general-settings-form.tsx`
  — the "Show your roadmap/changelog at …" preview URLs and the public-URL
  preview.
- Dashboard "Open Public Portal" button (`app/(workspace)/[slug]/page.tsx`).
- `components/changelog/changelog-share-button.tsx` (public share link).

**Must point at the ADMIN host:**
- `lib/workspaces/invites.ts`, `app/actions/members.ts`,
  `create-link-form.tsx`, `invite-links-list.tsx` — invite links (`/invite/…`,
  `/invite/link/…`); joining a workspace is an admin-context action.
- `components/settings/api-key-docs.tsx` — API base URL for `/api/v1/*` (admin
  API; keep on admin host, or a dedicated api host later).
- In-app notification links (already `/{slug}/feedback/…`, admin) — stay admin.

**Host-relative, no change needed** (they resolve on whatever host serves them):
- `PortalHeader`, board list, roadmap/changelog cards, comment sign-in links —
  all use `/${slug}/…`. On the portal host they stay on the portal host. ✓
- Sidebar/admin nav — all `/${slug}/…` on the admin host. ✓

**Auth-flow touch-points:**
- `/signin?next=…` must sign in on the **same host** and redirect back within it
  (both `(workspace)` layout and `(public)` pages build these).
- `middleware.ts` cookie-gate + host classification.
- Better Auth `trustedOrigins` = both hosts.
- Magic-link origin threading (see §3).

**Could break / watch list:**
- **Google OAuth multi-host** (see §3) — biggest risk; Phase 1 sidesteps it by
  keeping Google admin-only.
- **Legacy links/bookmarks/old emails** to `example.com/{slug}/roadmap` — the
  admin-host→portal-host redirects (middleware step 3) cover these.
- **Vitest suite** calls API route handlers directly (no host/middleware), so the
  81 existing tests should be unaffected; will confirm by running them after the
  middleware change.
- **CSP/embed:** the widget iframe loads portal-host content on customer sites —
  verify `frame-ancestors`/embed headers still permit it.

---

## 8. Proposed phasing (each phase independently shippable & reversible)

- **Phase 0 — URL plumbing (behavior-neutral).** Add `NEXT_PUBLIC_ADMIN_URL` +
  `NEXT_PUBLIC_PORTAL_URL`, both initially equal to today's host. Refactor every
  absolute-URL builder (the inventory in §7) to use the correct one. Ship; no
  user-visible change. This de-risks everything.
- **Phase 1 — Host split + session isolation.** Point the two env vars at two
  hosts; add host-aware middleware (classify + guard + legacy redirects);
  confirm host-only cookies; thread magic-link origin; keep Google admin-only;
  update `.env.example` + README + docs. **Delivers the requested behavior.**
- **Phase 1.5 — Google OAuth on both hosts** (optional): dynamic baseURL +
  second redirect URI.
- **Phase 2 — Custom / per-workspace domains** (optional): `workspaces.portal_domain`
  column, host→slug rewrite, wildcard DNS/cert.

---

## 9. Test matrix (Phase 1)

Manual, two local hosts:
1. Log in on admin → open portal tab → **portal shows me as anonymous.** ✅ goal.
2. Log in on portal → open admin tab → **admin shows me as logged-out.** ✅ goal.
3. Portal: vote/comment/follow/profile prompt for portal login; after portal
   login they work and use the portal identity.
4. Admin: all workspace pages work with the admin session; sidebar nav never
   leaves the admin host.
5. Admin "Open Public Portal" opens the portal host (new tab).
6. Old link `admin-host/{slug}/roadmap` → redirects to portal host.
7. Old link `portal-host/{slug}/feedback` → redirects to admin host.
8. Magic-link initiated on each host returns to that host.
9. Embed widget on a third-party page loads portal content and can vote after
   portal login.
10. `pnpm typecheck`, `pnpm lint`, `pnpm test` (81) green; `pnpm build` clean.

---

## 10. Rollback

- Phase 0 is behavior-neutral (rollback = revert commit).
- Phase 1 rollback = point both env vars back to one host and disable the host
  classification branch in middleware; cookies/DB untouched, so no data
  migration to undo.

---

## Open questions for you before implementation

1. **Host names** — confirm the production hostnames you want (e.g.
   `app.` + `portal.`? `app.` + `feedback.`? something else). I'll use
   `app.localhost` / `portal.localhost` for dev regardless.
2. **Google sign-in on the portal** — OK to keep Google **admin-only** in Phase 1
   (portal uses magic-link), and add portal Google later (1.5)? Or is portal
   Google required day one?
3. **Scope now** — do you want me to implement **Phase 0 + Phase 1** (delivers
   the isolation) and leave Phase 2 (custom domains) for later? That's my
   recommendation.
