# syntax=docker/dockerfile:1

# ── SHAPIO — one image, three roles ──────────────────────────────────────────
# The same image runs the web app, the background worker, and the one-shot
# migration job; compose picks the role with `command:`
#
#   next start                → the Next.js server
#   tsx scripts/worker.ts     → the pg-boss worker
#   tsx scripts/migrate.ts    → apply migrations, then exit
#
# (`next` and `tsx` are the node_modules/.bin shims, run from /app.)
#
# With NO command, scripts/docker-entrypoint.sh picks the role from
# SHAPIO_ROLE instead, defaulting to "all": migrate, then web server AND worker
# supervised in the one container. That is for platforms that deploy a registry
# image once and have no `command:` to set (Dokploy, Coolify, CapRover, a bare
# `docker run`) — without it such a deployment gets the web server alone: no
# migrations and no worker, so no email or background job ever runs.
#
# That is why this image ships the real source tree and a real node_modules
# instead of Next's `output: "standalone"` bundle (and why there is no longer a
# separate worker image). The worker runs TypeScript through tsx, and
# scripts/migrate.ts reads db/migrations off disk at runtime; a standalone build
# contains neither.
#
# Runtime node_modules is a --prod install, so devDependencies stay out (no
# typescript, no drizzle-kit). Migrations run through scripts/migrate.ts
# (drizzle-orm's migrator), never `drizzle-kit migrate`. There is no corepack or
# pnpm at runtime: corepack would try to download the package manager into
# ~/.cache on first use, which fails for the non-root user (EACCES), so every
# command below calls the .bin shims directly.

FROM node:22-bookworm-slim AS base

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app
RUN corepack enable


# ── Full dependency tree (devDependencies included) — build only ─────────────
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile


# ── Production-only dependency tree — shipped to the runner ──────────────────
FROM base AS prod-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod


FROM base AS builder

ENV NEXT_TELEMETRY_DISABLED=1

# Nothing deployment-specific is baked into this image — no domain, no secrets.
# Every NEXT_PUBLIC_* value is read only from server-only modules (lib/env.ts,
# lib/urls.ts, middleware.ts); no client component imports them, so Next.js
# never inlines them into the browser bundle. One published image therefore
# serves any domain, and changing your domain needs no rebuild.

# Placeholders so build-time env validation (lib/env.ts) passes. These are NOT
# used at runtime — real values are injected when the container starts.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV APP_SECRET="build-time-placeholder-value-000000000000"
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build


FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# uid/gid 1001 is deliberate and must not change: existing `uploads` volumes are
# owned by it, so a redeploy keeps write access.
RUN groupadd --system --gid 1001 shapio \
  && useradd --system --uid 1001 --gid shapio shapio

# --chown on the COPYs rather than a trailing `chown -R`: it avoids duplicating
# the whole tree in an extra layer, and the runtime user genuinely needs write
# access to .next (the image-optimization cache lives at .next/cache).
COPY --chown=shapio:shapio . .
COPY --from=prod-deps --chown=shapio:shapio /app/node_modules ./node_modules
COPY --from=builder --chown=shapio:shapio /app/.next ./.next

# The repo tracks shell scripts as mode 644 (no exec bit to inherit), so set it
# here rather than relying on the checkout.
RUN chmod +x /app/scripts/docker-entrypoint.sh

# Local-storage uploads live here (lib/storage/local.ts defaults to
# <cwd>/public/uploads); mount a volume to persist across redeploys. Not needed
# when STORAGE_S3_* is configured. Created (and owned) in the image so a *fresh*
# named volume mounted over it inherits that ownership and the non-root user can
# write to it.
RUN mkdir -p /app/public/uploads && chown -R shapio:shapio /app/public/uploads

USER shapio
EXPOSE 3000

# Role-aware (scripts/healthcheck.mjs): GET /api/health on the web server
# (a real query against Postgres) in the "all" and "app" roles, nothing to probe
# for a worker-only container. docker-compose.yml disables it on its worker
# service. Uses `node` rather than curl/wget — neither ships in
# node:*-bookworm-slim by default.
#
# start-period covers the slowest legitimate boot: in the default "all" role the
# web server starts only AFTER migrations have been applied, and the migration
# step waits for the database with backoff.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD ["node", "scripts/healthcheck.mjs"]

# Every explicit command (the `command:` of each docker-compose service, or
# `docker run <image> bash`) is exec'd verbatim by the entrypoint. "shapio" is a
# sentinel meaning "no command given — read SHAPIO_ROLE, default all". It must
# be a real value, not an empty CMD, or the base image's inherited `CMD ["node"]`
# would take its place.
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["shapio"]

# OCI metadata. This is what renders on the GitHub Packages page, and what
# links the package back to this repository.
LABEL org.opencontainers.image.title="Shapio" \
      org.opencontainers.image.description="Self-hosted product roadmap / feedback software." \
      org.opencontainers.image.source="https://github.com/stack256org/shapio" \
      org.opencontainers.image.documentation="https://github.com/stack256org/shapio#readme" \
      org.opencontainers.image.licenses="MIT"
