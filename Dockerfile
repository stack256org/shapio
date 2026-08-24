# ── SHAPIO web app (Next.js) ────────────────────────────────────────────────
# Multi-stage build producing a lean standalone server (see next.config.mjs
# `output: "standalone"`). The background worker uses Dockerfile.worker instead.

FROM node:22-bookworm-slim AS deps

WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile


FROM node:22-bookworm-slim AS builder

WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

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

# Standalone output: server + minimal node_modules, plus static assets & public/.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Local-storage uploads live here (lib/storage/local.ts defaults to
# <cwd>/public/uploads); mount a volume to persist across redeploys. Not needed
# when STORAGE_S3_* is configured.
RUN mkdir -p /app/public/uploads && chown -R shapio:shapio /app/public/uploads
# The runtime user needs write access to .next (image-optimization cache lives
# at .next/cache) — everything copied above defaults to root ownership.
RUN chown -R shapio:shapio /app/.next

USER shapio
EXPOSE 3000

# Compose/orchestrators can rely on this instead of declaring their own probe.
# Uses `node` rather than curl/wget — neither ships in node:*-bookworm-slim by
# default, and node's built-in fetch is already available in the runtime.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]

# OCI metadata. This is what renders on the GitHub Packages page, and what
# links the package back to this repository.
LABEL org.opencontainers.image.title="Shapio" \
      org.opencontainers.image.description="Self-hosted product roadmap / feedback software." \
      org.opencontainers.image.source="https://github.com/stack256org/shapio" \
      org.opencontainers.image.documentation="https://github.com/stack256org/shapio#readme" \
      org.opencontainers.image.licenses="MIT"
