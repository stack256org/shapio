# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).
Each tagged release publishes `ghcr.io/sahajtavethiya96/idearoads` and
`ghcr.io/sahajtavethiya96/idearoads-worker` images — see
`.github/workflows/release.yml`.

## [Unreleased]

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
