# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).
Each tagged release publishes the `ghcr.io/stack256org/shapio` image — see
`.github/workflows/release.yml`.

## [Unreleased]

## [0.2.0] - 2026-10-21

### Fixed

- **First-run admin could not sign in** ("Invalid email or password") after the Better Auth
  1.7 upgrade, which only accepts a credential account whose `account_id` is the user's id.
  The `/setup` wizard now stores the id, and migration `0034` repairs existing admins.
- **Posts failed to load on a database built from the migrations alone**: migration `0035`
  adds the missing `posts.merged_into_id` column and its foreign key. It is safe to run on
  databases that already have the column.
- A hydration mismatch on the dashboard's "Manage Roadmap" button (`Button asChild` now
  handles children that a server component streams in lazily).
- The new-feedback form now says why Publish and Save as Draft are disabled when the title
  is shorter than 3 characters.
- `pnpm test` exited 0 even when tests failed, so CI could not catch failures. It now exits
  non-zero on any failing test. The four tests that were hiding behind it were stale
  expectations for the previous status flow and are updated.

### Changed

- **Dependencies updated**, including Next.js 16.4, React 19.3, Better Auth 1.7, pg-boss
  12.38 and Vitest 5, plus minor and patch updates across the stack. Deferred for separate
  upgrades: TypeScript 7, Biome 2.5.15, Ultracite 8, `@types/node` 26, nodemailer 10,
  framer-motion 14, isomorphic-dompurify 4 and `@floating-ui/react` 0.27.
- **pnpm 12.14.0** is now the project's package manager (`packageManager` in `package.json`).
  Older Node 22 installs ship a Corepack that cannot start pnpm 12; use Corepack 0.36 or newer.
- **One image instead of two.** The web app, the worker and the migration job now run from
  the single `ghcr.io/stack256org/shapio` image; `Dockerfile.worker` and the `shapio-worker`
  image are gone. The image ships the full source and a production `node_modules` instead
  of Next's `standalone` bundle (the worker needs `tsx`, and migrations need
  `db/migrations`, on disk). The compose files run the same image three times with a
  different `command:`. New releases are no longer published as `shapio-worker`; existing
  tags stay pullable.

### Added

- A 404 page with **Go back** and **Go to home** buttons.
- **Single-container deploys now migrate and run the worker.** With no command, the image
  applies pending migrations, then runs the web server and one worker
  (`scripts/docker-entrypoint.sh`). Previously a platform that runs the image once (Dokploy,
  Coolify, `docker run`) started only the web server, so a release that added a column failed
  with a Server Components render error and no email or background job ever ran. Pick a role
  with `SHAPIO_ROLE` (`all`/`app`/`worker`/`migrate`); skip migrations with
  `SHAPIO_RUN_MIGRATIONS=false`. Compose users are unaffected: an explicit `command:` passes
  straight through.
- `scripts/healthcheck.mjs`: a role-aware container healthcheck.

### Upgrade notes

- **Back up your database before upgrading to 0.2.0.** pg-boss 12.38 migrates its own
  `pgboss` schema the first time the web server or worker starts, and older pg-boss versions
  cannot run against the migrated schema, so a rollback needs the backup. Migrations `0034`
  and `0035` also run on start (both are safe to re-run).
- **Behind a reverse proxy?** Better Auth 1.7 ignores forwarded headers by default, so the
  proxy must pass the original `Host` header (nginx: `proxy_set_header Host $host;`).
- **Compose users:** replace your compose file with the new one (or edit it): `migrate` and
  `worker` now use the `shapio` image, not `shapio-worker`, and `app` needs
  `command: ["/app/node_modules/.bin/next", "start"]`. `SHAPIO_WORKER_IMAGE` is gone; use
  `SHAPIO_IMAGE` for everything.
- **Platform deployments:** if you set the command to `node server.js` (or anything else) to
  work around the missing worker, clear it, or the entrypoint (and its auto-migrate) stays
  bypassed. Mount a volume at `/app/public/uploads` or configure S3/R2.

## [0.1.0] - 2026-08-21

### Added
- Self-hosted deployment support: `Dockerfile`, `Dockerfile.worker`,
  `docker-compose.yml`, `/api/health` (DB-backed).
- `docker-compose.external-db.yml` — an alternative to `docker-compose.yml`
  for self-hosters who already have a Postgres database (managed service or
  self-run) and don't want Compose to also run one.
- `.github/workflows/docker-build.yml` — build-only sanity check (amd64 +
  arm64) for the app and worker images on every PR.
- `.github/workflows/ci.yml` — typecheck, lint, test, and build on every
  PR, plus a schema-drift check that fails if `db/schema` changes without
  a generated migration.
- `.github/workflows/release.yml` — on a green CI run on `main`, builds and
  publishes versioned app/worker images (amd64 + arm64), tags the release
  from `package.json` + this file, and verifies the images are actually
  publicly pullable.
- `DESIGN.md`, `DESIGN-TOKENS.md`, `DESIGN_SYSTEM.md` — design system
  documentation.

## Earlier history

Development before this changelog started is available in the git log —
see `git log --oneline` for the full commit history.
