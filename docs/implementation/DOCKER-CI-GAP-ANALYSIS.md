# Docker / CI Gap Analysis — Shapio vs. Docket

Comparison of GitHub Actions, Docker, and README setup between this repo
(`shapio`) and the reference sibling project `docket`
(`d:\next\docket\docket`), both part of the same workspace. Docket's
Docker/release pipeline and README are more mature; the items below are what
shapio is missing or has diverged on.

## Files to touch

This is the file-by-file list of what was changed to close these gaps.
"Edit" = existing file, "New" = didn't exist in shapio before.

| File | Type | Why (section) |
|---|---|---|
| `README.md` | Edit | Rebrand from IdeaRoads; add Screenshots/Deploying-elsewhere/Backups/Docs-index/Roadmap; rewrite Docker section (#0, #10) |
| `.github/workflows/release.yml` | Edit | Fix `idearoads`/`idearoads-worker` leftover naming, 2 spots (#1) |
| `docker-compose.yml` | Edit | Pull published GHCR image instead of building locally; add `PGDATA` pin; add `init-uploads` service (#2, #5, #6) |
| `docker-compose.external-db.yml` | Not touched | Overlay only — inherits the image change from `docker-compose.yml` via Compose merge (#2, #5) |
| `docker-compose.build.yml` | New | Source-build variant, split out of what `docker-compose.yml` did before (#3) |
| `.env.docker.example` | New | Docker-quickstart-specific env template, trimmed vs. the full dev `.env.example` (#4) |
| `Dockerfile` | Edit | Add baked-in `HEALTHCHECK` + OCI `LABEL` block (#7) |
| `Dockerfile.worker` | Edit | Add OCI `LABEL` block (#7) |
| `.github/workflows/ci.yml` | Edit | Add `concurrency` block; add `timeout-minutes` to the `build` job; add `docs:check` step (#8, #10) |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | New | Community contribution intake (#9) |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | New | Community contribution intake (#9) |
| `.github/ISSUE_TEMPLATE/config.yml` | New | Community contribution intake (#9) |
| `.github/PULL_REQUEST_TEMPLATE.md` | New | Community contribution intake (#9) |
| `package.json` | Edit | Add `docs:sync` / `docs:check` scripts (#10) |
| `scripts/sync-readme.mjs` | New | Generates the version/tag block in `README.md`, CI-enforced (#10) |
| `docs/implementation/BACKUP-AND-RESTORE.md` | New | README's Backups section links here (#10) |

## 0. `README.md` was never rebranded from "IdeaRoads" (bug — fixed first)

This was bigger than the two leftover strings in `release.yml` (#1 below) —
the entire README was still the old project's:

- Title: `# IdeaRoads`
- Tagline/description: "IdeaRoads is an open-source, self-hostable user
  feedback and feature voting platform" — describes a *different product*
  than what shapio's own `package.json`, `Dockerfile` labels, and
  `docs/MASTER.md` describe.
- All three CI badges pointed at `github.com/sahajtavethiya96/IdeaRoads/...`
- Every `git clone` example used `idearoads` as the directory name
- Every `docker pull` / prebuilt-image example used
  `ghcr.io/sahajtavethiya96/idearoads` and `...-worker`
- The "First release only" package-visibility note said
  `Packages → idearoads / idearoads-worker`
- The data-volumes table listed `idearoads_pgdata` / `idearoads_uploads`

Fixed by rewriting `README.md` to use `Shapio` / `shapio` / `shapio-worker`
throughout, and pointing badges/links at `github.com/stack256org/shapio` to
match the upstream org convention `docket`'s README already follows.

## 1. Leftover "idearoads" naming in `release.yml` (bug — fixed)

- The "First release only" comment near the top of the file
- The final `Summary` step's job-summary note

Both fixed to say `shapio` / `shapio-worker`.

## 2. `docker-compose.yml` builds from source instead of pulling the published image (fixed)

`release.yml` already builds and publishes `ghcr.io/<repo>` (app) and
`ghcr.io/<repo>-worker` (worker) images on every push to `main`, but
`docker-compose.yml` didn't use them — every service did:

```yaml
app:
  build:
    context: .
    dockerfile: Dockerfile
```

Docket's `docker-compose.yml` instead pulls the release image:

```yaml
x-image: &image ${DOCKET_IMAGE:-ghcr.io/stack256org/docket}:${IMAGE_TAG:-latest}
...
app:
  image: *image
  pull_policy: always
```

Fixed by switching `docker-compose.yml` to `x-app-image` / `x-worker-image`
anchors pointing at `ghcr.io/stack256org/shapio` / `-worker`, with
`pull_policy: always`, and moving the old build-based service definitions
into a new `docker-compose.build.yml` (#3).

## 3. Missing `docker-compose.build.yml` (fixed)

Docket ships three compose files:

| File | Purpose |
|---|---|
| `docker-compose.yml` | pull published image, bundled Postgres |
| `docker-compose.external-db.yml` | pull published image, your own Postgres |
| `docker-compose.build.yml` | build from source, bundled Postgres |

Shapio only had the first two, and the "first" one behaved like the third
(built from source). Added `docker-compose.build.yml` as the explicit
source-build path.

## 4. Missing `.env.docker.example` (fixed)

Docket ships a trimmed, docker-quickstart-specific env file so the README's
`curl` one-liner install works without pulling in the full dev-oriented
`.env.example`. Added the equivalent for shapio.

## 5. No `init-uploads` ownership-fix service (fixed)

Docket runs a tiny `alpine` one-shot service before `migrate`/`app`/`worker`
that `chown -R`s the uploads volume, guarding against a pre-existing named
volume created under root ownership (Docker's default for a volume nobody
has written to yet) before the app started running as a non-root user.
Added the same pattern to `docker-compose.yml` and `docker-compose.build.yml`,
targeting uid/gid 1001 (shapio's actual runtime user, per the Dockerfile —
docket's is 1000).

## 6. No `PGDATA` pin on the `postgres` service (fixed)

Docket pins `PGDATA: /var/lib/postgresql/data` explicitly, because the
official Postgres image's default data directory changed in Postgres 18 —
an unpinned deploy that later bumps the `postgres:` image tag could have its
volume mount land at the wrong path and come up with an empty database.
Added the same pin to both `docker-compose.yml` and `docker-compose.build.yml`.

## 7. No `HEALTHCHECK` / OCI `LABEL` baked into the Dockerfile (fixed)

Docket's `Dockerfile` bakes in a `HEALTHCHECK` and an OCI `LABEL` block so
the image is self-describing and healthy-by-default even outside Compose,
and the GHCR package page renders a title/description/source link.

Added the same to shapio's `Dockerfile` (HEALTHCHECK using `node -e
fetch(...)` rather than curl/wget, since neither ships in
`node:*-bookworm-slim` by default) and `Dockerfile.worker` (LABEL only — it's
not a web server, so no HEALTHCHECK). The compose files' own duplicate
healthcheck declarations on the `app` service were removed since the image
now ships its own.

## 8. CI (`ci.yml`) missing concurrency + timeout guards (fixed)

Added a top-level `concurrency` block (cancel superseded runs on the same
ref) and `timeout-minutes: 20` on the `build` job, matching docket's `ci.yml`.

## 9. No `.github/ISSUE_TEMPLATE/` or `PULL_REQUEST_TEMPLATE.md` (fixed)

Added `bug_report.yml`, `feature_request.yml`, `config.yml`, and
`PULL_REQUEST_TEMPLATE.md`, adapted from docket's to shapio's actual product
areas (workspaces, boards, posts, voting, comments, roadmap, changelog,
notifications, Platform Admin) instead of docket's ticketing areas.

## 10. README content gaps + generated version block (fixed)

Added to `README.md`: a "Deploying somewhere else" section (Coolify/Dokploy/
Portainer/Kubernetes, Railway/Render/Fly, and a plain server), a Backups
section linking to the new `docs/implementation/BACKUP-AND-RESTORE.md`, a
flat Documentation index table, and a public-facing Roadmap section built
from the existing "What's Implemented" / "What's Documented but Not Yet
Built" content.

Also adopted docket's CI-enforced generated version block: added
`scripts/sync-readme.mjs` (adapted for shapio's two image names) and
`docs:sync` / `docs:check` scripts in `package.json`, wired `docs:check` into
`ci.yml` so the README's tag ladder can never drift from `package.json`'s
version the way it could before (it was hand-typed).

Not added: a Screenshots section — no real product screenshots exist to use,
and fabricating placeholders would be worse than not having the section.

## Not a gap — intentional differences

- **Two Dockerfiles vs. one**: shapio splits `Dockerfile` (app) and
  `Dockerfile.worker` (worker) into separate images, each published and
  matrixed in `release.yml`. Docket uses a single image for app/worker/migrate
  via different `command:` overrides. Both are valid; shapio's split is now
  fully wired through both CI and `docker-compose.yml`.
- **`docker-build.yml` sanity workflow**: shapio has an extra PR-time
  build-only Docker check that docket doesn't have. Nothing to change here —
  it's an addition, not a gap.
- **No `pnpm setup` / seed step**: docket's `migrate` service runs
  `pnpm setup` (migrate + seed default statuses/categories/priorities).
  Shapio's `migrate` service only runs `scripts/migrate.ts`. Left as-is —
  shapio has no equivalent "seed defaults on first boot" need.

## Out of scope — flagged but not touched

`docs/MASTER.md` and `docs/implementation/README.md` are still titled
"IdeaRoads" and describe the product under that name throughout. That's a
product-documentation rename, separate from the git actions / Docker / README
scope this pass covered.

## Heads up: volume rename is a breaking change for any existing deployment

`docker-compose.yml`'s named volumes were renamed
`idearoads_pgdata`/`idearoads_uploads` → `shapio_pgdata`/`shapio_uploads` to
match the rest of the rebrand. If this has ever been deployed anywhere under
the old names, that deployment needs a one-time manual volume rename (or a
data copy) on upgrade — a fresh `docker compose up -d` would otherwise
attach to new, empty volumes instead of the existing data. Worth a
CHANGELOG entry if that applies.
