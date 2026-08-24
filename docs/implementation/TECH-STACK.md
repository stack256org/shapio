# IdeaRoads — Tech Stack & Configuration

> **Implementation reference — not product specification.**
> This file documents *how* IdeaRoads is built. For *what* the product does, see the product docs (`README.md`, `MASTER.md`, `PLATFORM.md`, and `features/`).

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend + Backend | Next.js 15 (App Router, TypeScript) |
| UI Components | daisyUI (Tailwind CSS v4 plugin) + custom `ir-*` design tokens; Headless UI for JS-driven overlays (dialog, menu, listbox) where a real popover/dialog primitive is needed |
| Styling | Tailwind CSS v4 |
| Forms | react-hook-form + zod (zodResolver) |
| Client Data Fetching | SWR |
| Date Utilities | date-fns |
| ID Generation | @paralleldrive/cuid2 |
| Database | PostgreSQL + Drizzle ORM |
| Background Jobs / Cron | pg-boss (same PostgreSQL DB, no Redis) |
| Email Templates | React Email (components → HTML) |
| Email Delivery | Nodemailer (configurable SMTP) |
| Dev Email Testing | Mailtrap free tier / Mailhog (local) |
| Auth | Better Auth (Magic Link + Google OAuth; optional Email + Password, opt-in per instance) |
| Encryption | AES-256-GCM (`lib/encrypt.ts`, for webhook secrets + API keys) |
| Linting + Formatting | Biome (replaces ESLint + Prettier, faster) |
| Super Admin Panel | Platform Admin (custom built at `/orbit`) |
| Deployment | Docker Compose (self-hosted) |
| License | MIT |

### Key Dev Dependencies

| Package | Purpose |
|---|---|
| `drizzle-kit` | Migration generation CLI (`pnpm db:generate`) |
| `biome` | Linting + formatting (single tool, no config sprawl) |
| `embedded-postgres` | Local dev DB (no Docker required for solo dev) |
| `@react-email/components` | Email template primitives |
| `@react-email/render` | React Email → HTML string (server-side only) |

---

## Authentication (implementation)

- **Magic Link** — email a one-time login link via Nodemailer SMTP.
- **Google OAuth** — one-click sign in / register.
- **Email + Password** *(optional)* — Better Auth's `emailAndPassword` provider is always configured so an existing password account can always sign in, but self-serve *registration* (`/signup`, and the password field on `/signin`) is gated at runtime by the `password_auth` feature flag (`lib/orbit/feature-flags.ts`), off by default. The `/setup` first-run wizard bypasses this flag entirely — it inserts the first admin's user + credential-account rows directly (see `app/actions/setup.ts`), the same way `pnpm create:admin`-style bootstrap scripts do elsewhere in the ecosystem, so a brand-new instance never depends on SMTP or Google being configured first.
- Powered entirely by **Better Auth** (open-source), no paid auth service.

---

## Key Design Decisions

### Passwordless by Default, Password Auth Opt-In
Better Auth's Magic Link is the default and only method most deployments need — no passwords to manage, no forgot/reset flow to build. Self-hosted instances that want a lower-friction path (no SMTP/Google required) can turn on `password_auth` per-instance; it's a runtime DB feature flag, not a build-time option, so it can be toggled without a redeploy.

### No Redis
pg-boss uses the same PostgreSQL instance for the background job queue. One less service to operate in production.

### No Paid Services
Everything is free and open-source: Better Auth (auth), Nodemailer (email), pg-boss (jobs), daisyUI (components), Drizzle ORM (database). Platform Admin is custom-built — not a third-party paid service.

### Denormalised Counters
`vote_count` and `comment_count` on the `posts` table are maintained atomically inside `db.transaction()` with `GREATEST(count - 1, 0)` guards. Avoids expensive COUNT(*) queries on every page load.

### Partial Unique Indexes on Votes
Drizzle ORM does not support partial unique indexes declaratively. The `votes` table requires raw SQL migrations:
- `UNIQUE (post_id, user_id) WHERE user_id IS NOT NULL`
- `UNIQUE (post_id, user_email) WHERE user_email IS NOT NULL`

### Soft Deletes on Comments Only
Comments are soft-deleted (body → `"[deleted]"`, author fields cleared). Posts and other entities are hard-deleted. This preserves thread structure when a parent comment is removed.

### Audit Log is Fire-and-Forget
`createAuditLog()` is never awaited — it runs as a best-effort background insert. Audit log failure never blocks the primary action.

### Orbit is Invisible
`/orbit` returns 404 (not 403) for non-platform-admins. The panel does not reveal itself to users who lack access.

### Durable Email Outbox
Email is never sent synchronously. `enqueueEmail()` inserts a row into `email_outbox` first, then enqueues the pg-boss job. If the app crashes between these two lines, the nightly `CLEANUP_EMAIL_OUTBOX` cron re-queues any rows still stuck in `queued`. Zero email loss.

### Webhook Delivery is SSRF-Protected
Outbound webhook endpoints are validated on every delivery attempt (not cached). All RFC 1918, loopback, link-local, and IPv6 ULA addresses are blocked. Endpoints auto-disable at 50 consecutive failures with email notification to the Brand Admin.

### API Keys are Hashed, Never Stored Raw
API key raw values are generated as `ir_live_{cuid2}`, shown to the user once, then discarded. Only the SHA-256 hash is stored in `api_keys.token_hash`. Lookup is O(1) via the unique index on the hash.

### Biome Replaces ESLint + Prettier
A single `biome.json` replaces two separate tool configs. Faster (Rust-based), enforced via pre-push git hook — commits blocked if lint fails.

### Idempotent Job Handlers
Every pg-boss handler reads current state first, checks if the action already completed (state guard), and returns early (no-op) if so. All handlers are safe to retry without side effects.

---

## Environment Variables

Only `DATABASE_URL` / `APP_SECRET` / `NEXT_PUBLIC_APP_URL` are boot-time
required. Google OAuth, SMTP, S3/R2 storage, and the inbound email webhook
secret are optional here — they can instead be set from **Admin →
Integrations** or the setup wizard, stored in the database (secrets encrypted
at rest, keyed off `APP_SECRET` — see `lib/crypto.ts`). A database value
always wins over the matching env var below. Full picture, including which
setting needs an app restart to take effect, in
[`INTEGRATIONS.md`](INTEGRATIONS.md).

```env
# Database
DATABASE_URL="postgresql://idearoads:idearoads@localhost:5432/idearoads"

# App
APP_SECRET="generate with: openssl rand -base64 32"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Google OAuth (optional — leave blank to disable, or set via Integrations)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# SMTP (optional here — or set via Integrations)
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="IdeaRoads <noreply@yourdomain.com>"

# Platform Admin
ORBIT_SEED_EMAIL=""            # First Platform Admin email — seeded at startup if set
ENABLE_IMPERSONATION="false"   # Set to "true" to allow Platform Admin user impersonation
```
