# Shapio

[![CI](https://github.com/stack256org/shapio/actions/workflows/ci.yml/badge.svg)](https://github.com/stack256org/shapio/actions/workflows/ci.yml)
[![Docker build](https://github.com/stack256org/shapio/actions/workflows/docker-build.yml/badge.svg)](https://github.com/stack256org/shapio/actions/workflows/docker-build.yml)
[![Release](https://github.com/stack256org/shapio/actions/workflows/release.yml/badge.svg)](https://github.com/stack256org/shapio/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Shapio is an open-source, self-hostable user feedback and feature voting platform. Teams use it to collect product feedback, let users vote on feature requests, track work on a public roadmap, and publish a changelog — all under their own domain.

Inspired by Canny and Fider. MIT licensed. No paid services or cloud vendor lock-in.

---

## Contents

- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Running it with Docker](#running-it-with-docker)
- [Deploying somewhere else](#deploying-somewhere-else)
- [Health checks](#health-checks)
- [Backups](#backups)
- [What's Implemented](#whats-implemented)
- [What's Documented but Not Yet Built](#whats-documented-but-not-yet-built)
- [Project Structure](#project-structure)
- [Commands](#commands)
- [Documentation](#documentation)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Tech Stack

| Layer           | Choice                                    |
| --------------- | ----------------------------------------- |
| Framework       | Next.js 16 (App Router, TypeScript)       |
| UI              | daisyUI + Tailwind CSS v4, custom `ir-*` design tokens |
| Database        | PostgreSQL + Drizzle ORM                  |
| Auth            | Better Auth — Magic Link + Google OAuth   |
| Background Jobs | pg-boss (same PostgreSQL DB, no Redis)    |
| Email           | Nodemailer + SMTP + React Email templates |
| Linting         | Biome (replaces ESLint + Prettier)        |
| Deployment      | Docker Compose, or manual/Node            |

---

## Quick Start

For local development, without Docker:

```bash
pnpm install
cp .env.example .env
pnpm db:local       # spin up embedded PostgreSQL (dev only)
pnpm db:migrate
pnpm dev            # starts Next.js + background worker concurrently
```

Open `http://localhost:3000` and sign in with a magic link.

Deploying this somewhere real? See [Running it with Docker](#running-it-with-docker) below.

### Two-host mode (Workspace vs Public Portal)

The Workspace/Admin app and the Public Portal can run as independent
applications with **isolated sessions** — signing into one never authenticates
the other. Set two hosts in `.env`:

```bash
NEXT_PUBLIC_ADMIN_URL=http://app.localhost:3000
NEXT_PUBLIC_PORTAL_URL=http://portal.localhost:3000
```

Then use `http://app.localhost:3000` for the admin app and
`http://portal.localhost:3000` for a workspace's public portal
(`portal.localhost:3000/{slug}/roadmap`, etc.). Browsers resolve `*.localhost`
to loopback automatically; plain `http://localhost:3000` keeps working as a
single-origin full app. Leave both vars unset for single-origin mode. See
[`docs/migration/01-portal-subdomain-auth.md`](./docs/migration/01-portal-subdomain-auth.md).

To promote yourself to superadmin:

```bash
pnpm make:admin you@example.com
```

Without `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` set, the worker logs emails to stdout instead of sending them.

### Configuration

`.env` only needs the handful of values required before the database is even
reachable (`DATABASE_URL`, `APP_SECRET`, `NEXT_PUBLIC_APP_URL`). Everything
optional — SMTP, Google OAuth, S3/R2 file storage, the inbound email webhook
secret — can instead be set from **Admin → Integrations** or the first-run
setup wizard, backed by the database, with secrets encrypted at rest. `.env`
still works for all of these as a fallback for existing installs. See
[`docs/implementation/INTEGRATIONS.md`](./docs/implementation/INTEGRATIONS.md)
for the full picture, including which settings need an app restart to take
effect.

---

## Running it with Docker

Three compose files. Pick **one**. They are alternatives, never used together.

| File | Use it when | Where the image comes from |
|------|-------------|----------------------------|
| `docker-compose.yml` | **Almost everyone.** PostgreSQL included. | Downloaded, prebuilt |
| `docker-compose.external-db.yml` | You already have PostgreSQL, such as Neon, Supabase or RDS. | Downloaded, prebuilt |
| `docker-compose.build.yml` | You changed the code. | Compiled on your machine |

All three run the same three parts: the **app**, the **worker** that sends
email and runs background jobs, and a one-off **migrate** step that prepares
the database before the other two start.

**You need:** Docker and Docker Compose v2 (`docker compose version`), and
nothing else — no local Node.js or PostgreSQL install.

### The normal way

```bash
curl -O https://raw.githubusercontent.com/stack256org/shapio/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/stack256org/shapio/main/.env.docker.example
# set APP_SECRET (32+ chars — openssl rand -base64 36) and NEXT_PUBLIC_APP_URL
docker compose up -d
```

This downloads the app and worker images from
[GitHub Packages](https://github.com/stack256org/shapio/pkgs/container/shapio),
then starts PostgreSQL, applies migrations, and leaves `app` and `worker`
running. The app publishes on `http://localhost:3000` — change the host port
with `APP_PORT=8080` in `.env` if 3000 is already taken.

<!-- BEGIN GENERATED: image-tags -->
Pin a version in production, because `latest` moves with every release:

```bash
IMAGE_TAG=0.1.0 docker compose up -d
```

Available tags are `latest`, the `0` / `0.1` / `0.1.0` ladder, `main` (rebuilt on
every change, expect rough edges), and a fixed `sha-<short>` per build. Each carries builds
for both Intel and ARM machines:

```bash
docker pull ghcr.io/stack256org/shapio:0.1.0          # app
docker pull ghcr.io/stack256org/shapio-worker:0.1.0   # worker
```
<!-- END GENERATED: image-tags -->

<sub>The block above is generated from the `version` in `package.json` by
`scripts/sync-readme.mjs`, and CI fails if it drifts. Run `pnpm docs:sync` after a version
bump rather than editing it by hand.</sub>

> **First release only:** a new GitHub Packages entry defaults to
> **private**, even in a public repository. Repository → Packages →
> `shapio` / `shapio-worker` → Package settings → Change visibility →
> Public — otherwise `docker pull` fails for anyone not signed in. CI's
> `verify-public` job in `release.yml` checks this automatically and fails
> loudly until it's done.

### With your own database

Already have a Postgres database (managed service, or your own instance)?

```bash
curl -O https://raw.githubusercontent.com/stack256org/shapio/main/docker-compose.external-db.yml
curl -o .env https://raw.githubusercontent.com/stack256org/shapio/main/.env.docker.example
# replace DATABASE_URL with your own connection string
docker compose -f docker-compose.external-db.yml up -d
```

See the comments in
[`docker-compose.external-db.yml`](./docker-compose.external-db.yml) if your
database runs on the Docker host itself rather than a remote server.

### Building it yourself

Only if you changed the code. This compiles both images, which on a small
server is slow and memory-hungry.

```bash
git clone https://github.com/stack256org/shapio && cd shapio
cp .env.docker.example .env
# set APP_SECRET and NEXT_PUBLIC_APP_URL
docker compose -f docker-compose.build.yml up -d
```

If you used one of the other two files, add the same `-f <file>` to every
`docker compose` command from here on.

### Where your data lives

| Volume | Mounted at | Holds |
|--------|-----------|-------|
| `shapio_pgdata` | `/var/lib/postgresql/data` | Everything: workspaces, posts, votes, accounts, sessions |
| `shapio_uploads` | `/app/public/uploads` | Uploaded files, on the default local storage setting only |

Volume names are pinned literally (not derived from the Compose project
name) so a redeploy always reattaches to the same volume instead of
silently creating a new empty one. They survive `down`, `pull`, and
`up -d` — only `docker compose down -v` destroys them.

### Updating

```bash
docker compose pull
docker compose up -d
```

Building from source instead? `git pull && docker compose -f docker-compose.build.yml up -d --build`.

The `migrate` service re-applies before `app`/`worker` start; it's safe to
run repeatedly. Back up first (see [Backups](#backups)) and check
[CHANGELOG.md](./CHANGELOG.md) for anything needing manual work before
updating a production instance.

---

## Deploying somewhere else

### Anything that runs a container

Coolify, Dokploy, CapRover, Portainer, Kubernetes, Docker Swarm, ECS. Point
them at `ghcr.io/stack256org/shapio` (app) and `ghcr.io/stack256org/shapio-worker`
(worker):

| Service | Image | Command | Notes |
|---------|-------|---------|-------|
| app | `shapio` | `node server.js` (image default) | Serves on port 3000. Probe `GET /api/health`. |
| worker | `shapio-worker` | `tsx scripts/worker.ts` (image default) | No web port. Email and background jobs don't run without it. |
| migrate | `shapio-worker` | `tsx scripts/migrate.ts` | Run once, to completion, before the other two on each deploy. |

On the default `local` storage setting, mount a permanent volume at
`/app/public/uploads` for the app and worker services. S3/R2 storage needs
none.

### Railway, Render, Fly.io

1. Fork this repository.
2. Create a project pointing at your fork.
3. Set the required settings (`DATABASE_URL`, `APP_SECRET`, `NEXT_PUBLIC_APP_URL`).
4. Add a PostgreSQL add-on.
5. Deploy.

The same caveat applies as for any container platform: you need the
**worker** as a second service and a one-off **migrate** step, not just the
web process.

### A plain server

1. Install Node.js 22, PostgreSQL 16 and pnpm.
2. Clone the repository, run `pnpm install`, and set up `.env`.
3. Build and prepare it:
   ```bash
   pnpm build
   pnpm db:migrate
   pnpm make:admin you@example.com
   ```
4. Keep **two** processes running, with systemd, PM2 or similar:
   ```bash
   pnpm start            # the app on :3000
   pnpm worker:start     # the background worker for email and jobs
   ```
5. Put Nginx or Caddy in front for HTTPS, forwarding to `:3000`.

---

## Health checks

`GET /api/health` needs no authentication and checks real database
connectivity (not just "the process is up"):

```bash
curl http://localhost:3000/api/health
# {"ok":true,"db":"connected"}       -> 200
# {"ok":false,"db":"disconnected"}   -> 503
```

The `app` image's Docker `HEALTHCHECK` uses this, so `docker compose ps`
reports real health with no extra configuration.

---

## Backups

Backups are not automatic. You need to set them up.

Always back up the **Postgres database**. Also back up the
**`shapio_uploads` volume** if you're using local file storage — not needed
on S3 or R2. [`docs/implementation/BACKUP-AND-RESTORE.md`](./docs/implementation/BACKUP-AND-RESTORE.md)
has the commands.

---

## What's Implemented

### Authentication

- Magic link sign-in (no passwords)
- Google OAuth
- Secure cookie sessions with IP and User-Agent tracking
- Post-auth redirect: users go to their workspace (`/{slug}`), admins go to `/orbit`

### Account Settings (`/account/profile`)

- Edit name and email
- View and revoke active sessions
- Export account data as JSON
- Delete account

### Platform Admin (`/orbit/*`)

Superadmin-only panel — returns 404 for everyone else.

- **Overview** — user count, email queue size, job queue summary
- **Users** — table of all users with inline role promotion and ban/unban
- **Email** — outbox status (queued → sending → sent/failed) and inbound SMTP webhook events (bounces, deliveries, opens, clicks)
- **Queues** — pg-boss job states grouped by queue name

### Background Worker

Runs as a separate process alongside Next.js. Uses pg-boss (no Redis required).

| Job                    | Trigger                 | Description                                     |
| ---------------------- | ----------------------- | ------------------------------------------------ |
| `email.send`           | `enqueueEmail()` called | Process `email_outbox` row → Nodemailer SMTP    |
| `email.outbox-reap`    | Cron every 15 min       | Re-queue emails stuck in `queued` state         |
| `email.events-prune`   | Cron 3 AM daily         | Delete email events older than retention period |
| `scaffold.healthcheck` | Cron every 10 min       | System health check                             |

### Durable Email Outbox

Email is never sent inline. `enqueueEmail()` writes to `email_outbox` first, then enqueues the pg-boss job. If the app crashes between those two steps, the reap cron re-queues any stuck rows. Zero email loss.

### Audit Logging

Fire-and-forget audit trail on user creation, magic link send, logout, data export, and account deletion. Never blocks the primary action.

---

## What's Documented but Not Yet Built

The full product specification lives in [`/docs`](./docs). Features are documented in build order:

| #   | Feature                         |
| --- | -------------------------------- |
| 02  | Workspaces                      |
| 03  | Team Members & Invites          |
| 04  | Feedback Boards                 |
| 05  | Feedback Posts                  |
| 06  | Voting                          |
| 07  | Comments                        |
| 08  | Categories & Status             |
| 09  | Public Roadmap                  |
| 10  | Changelog                       |
| 11  | Notifications                   |
| 12  | Workspace Settings & Moderation |

Start with [`docs/MASTER.md`](./docs/MASTER.md) — it is the single source of truth: full database schema, folder structure, all background jobs, environment variables, and the build order.

---

## Project Structure

```
app/
├── page.tsx                     Landing / sign-in prompt
├── (auth)/login/                Magic link + Google OAuth sign-in
├── post-auth/                   Role-based redirect after sign-in
├── account/                     Account settings (profile, sessions, export)
├── (orbit)/orbit/               Admin panel (workspaces, users, feature flags, settings)
└── api/                         Auth handler, account export, email webhook

lib/
├── auth.ts                      Better Auth config (magic link, Google, admin plugin)
├── authz.ts                     requireSession / requireAdmin helpers
├── audit.ts                     Fire-and-forget audit logging
├── email/                       enqueueEmail(), React Email templates, renderer
└── worker/                      pg-boss init, job handlers, cron schedules

db/
├── schema/                      Drizzle table definitions
└── migrations/                  Auto-generated SQL (drizzle-kit)

scripts/
├── worker.ts                    Worker entry point
├── make-admin.ts                Promote user to superadmin by email
└── dev-db.ts                    Embedded PostgreSQL for local development

docs/
├── MASTER.md                    Complete project blueprint
└── features/                    Per-feature specifications (00–13)
```

---

## Commands

| Command            | Description                              |
| ------------------- | ----------------------------------------- |
| `pnpm dev`         | Start Next.js + worker in watch mode     |
| `pnpm dev:next`    | Start Next.js only                       |
| `pnpm worker`      | Start worker only (watch mode)           |
| `pnpm build`       | Production build                         |
| `pnpm typecheck`   | Run TypeScript type checker              |
| `pnpm lint`        | Lint with Biome                          |
| `pnpm lint:fix`    | Lint and auto-fix                        |
| `pnpm test`        | Run tests (Vitest)                       |
| `pnpm db:local`    | Start embedded PostgreSQL (dev)          |
| `pnpm db:migrate`  | Run pending migrations                   |
| `pnpm db:generate` | Generate migration files from schema     |
| `pnpm db:push`     | Push schema directly (no migration file) |
| `pnpm db:reset`    | Drop all tables and re-migrate           |
| `pnpm make:admin`  | Promote user to superadmin               |
| `pnpm docs:sync`   | Regenerate the version block in this README from `package.json` |
| `pnpm docs:check`  | Fail if this README's version block is out of date (CI runs this) |

See [`docs/MASTER.md`](./docs/MASTER.md) for the full environment variable reference.

---

## Documentation

| Topic | Document |
|-------|----------|
| Product specification | [docs/MASTER.md](./docs/MASTER.md) |
| Platform architecture, roles, permissions | [docs/PLATFORM.md](./docs/PLATFORM.md) |
| Per-feature specs | [docs/features/](./docs/features/) |
| Tech stack, env vars, design decisions | [docs/implementation/TECH-STACK.md](./docs/implementation/TECH-STACK.md) |
| Database schema | [docs/implementation/DATABASE.md](./docs/implementation/DATABASE.md) |
| Route groups, folder structure | [docs/implementation/ARCHITECTURE.md](./docs/implementation/ARCHITECTURE.md) |
| Background jobs | [docs/implementation/JOBS.md](./docs/implementation/JOBS.md) |
| SMTP / OAuth / storage config | [docs/implementation/INTEGRATIONS.md](./docs/implementation/INTEGRATIONS.md) |
| Backups | [docs/implementation/BACKUP-AND-RESTORE.md](./docs/implementation/BACKUP-AND-RESTORE.md) |

---

## Roadmap

Authentication, workspaces, the account settings area, and the Platform Admin
panel work today (see [What's Implemented](#whats-implemented)). Everything
else in [What's Documented but Not Yet Built](#whats-documented-but-not-yet-built)
— boards, posts, voting, comments, the public roadmap, changelog, and
notifications — is specified in `docs/features/` but not yet built.

Want to help build one of these, or something not listed?
[Open an issue](https://github.com/stack256org/shapio/issues/new/choose)
describing the problem you're trying to solve first, so the approach can be
agreed before you spend time on it.

---

## Contributing

Read [CLAUDE.md](./CLAUDE.md) first — it documents the design rules, component conventions, and hard rules every change is expected to follow. For anything beyond a small fix, open an issue first to discuss the approach.

Before opening a PR, run:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## License

MIT — see [LICENSE](./LICENSE) for details.
