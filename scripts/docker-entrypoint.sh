#!/usr/bin/env bash
#
# Role dispatcher for the Shapio image.
#
# The image fills three roles (web server, pg-boss worker, one-shot migration).
# Docker Compose picks one per service with `command:`, and anything passed that
# way is exec'd verbatim by the pass-through below — so the compose setups
# behave exactly as they would without this script.
#
# A platform that deploys the image ONCE from a registry URL (Dokploy, Coolify,
# CapRover, a bare `docker run`) has no `command:` to set. Without this script it
# would get the web server alone: no migrations (a release that adds a column
# fails with a Server Components render error) and no worker, so no email or
# background job ever runs. That is what the `all` role below fixes: one
# container that migrates, serves, and runs exactly one worker.
#
#   SHAPIO_ROLE=all      (default) migrate, then web server + worker together
#   SHAPIO_ROLE=app      web server only
#   SHAPIO_ROLE=worker   worker only
#   SHAPIO_ROLE=migrate  apply migrations, then exit
#
#   SHAPIO_RUN_MIGRATIONS=false  skip the migration step (managed database whose
#                                app user may not run DDL). Defaults to true for
#                                `all`/`migrate`, false otherwise.
#
# bash, not sh: `wait -n PID` (used to notice either child dying) needs bash 5.1+
# and the base image is node:22-bookworm-slim, which ships bash 5.2.

set -euo pipefail

# Call the .bin shims instead of going through pnpm: a pnpm wrapper per child
# costs another Node process and puts another hop between Docker's SIGTERM and
# the process that has to act on it (and there is no corepack at runtime). Both
# `next` and `tsx` are production dependencies, so these exist in the image's
# --prod node_modules.
NEXT_BIN="node_modules/.bin/next"
TSX_BIN="node_modules/.bin/tsx"

role="${SHAPIO_ROLE:-all}"

# Pass-through. Every docker-compose service lands here, as does `docker run
# <image> sh`. "shapio" is the image's own CMD: a sentinel meaning "no command
# given, decide from the environment". It has to be a real value rather than an
# empty CMD, because the base image's inherited `CMD ["node"]` would otherwise
# take its place.
if [ "$#" -gt 0 ] && [ "$1" != "shapio" ]; then
  exec "$@"
fi

case "$role" in
  all | app | worker | migrate) ;;
  *)
    echo "[entrypoint] unknown SHAPIO_ROLE=\"$role\" (expected: all, app, worker, migrate)" >&2
    exit 64
    ;;
esac

# Local-disk uploads only survive a redeploy if /app/public/uploads is a mounted
# volume. Platforms that run the image once (Dokploy, Coolify, ...) don't add
# one, so uploads then "work" until the next deploy and 404 afterwards. Warn
# loudly. Only for the roles that serve uploads (this point is never reached by
# a compose service, whose volume is mounted explicitly and whose migrate
# service has no use for one). Skipped when S3/R2 storage is configured in .env,
# or STORAGE_LOCAL_DIR points somewhere other than the path checked here; S3 can
# also be set in-app (Admin → Integrations), hence the wording. Never fatal.
if [ -z "${STORAGE_S3_BUCKET:-}" ] && [ -z "${STORAGE_LOCAL_DIR:-}" ]; then
  case "$role" in
    migrate) ;;
    *)
      if [ -d /app/public/uploads ] && ! grep -q " /app/public/uploads " /proc/self/mountinfo 2>/dev/null; then
        echo "[entrypoint] WARNING: /app/public/uploads is not a mounted volume. With local file storage," >&2
        echo "[entrypoint] uploaded files will be LOST on redeploy." >&2
        echo "[entrypoint] Mount a persistent volume at /app/public/uploads, or configure S3/R2 storage" >&2
        echo "[entrypoint] (env STORAGE_S3_* or Admin → Integrations). See README.md → Where your data lives." >&2
      fi
      ;;
  esac
fi

# Migrations default on for the roles that own the schema. `app` and `worker`
# are the compose-style roles, where the dedicated `migrate` service owns it.
case "$role" in
  all | migrate) run_migrations="${SHAPIO_RUN_MIGRATIONS:-true}" ;;
  *) run_migrations="${SHAPIO_RUN_MIGRATIONS:-false}" ;;
esac

# scripts/migrate.ts is safe to run on every boot: it waits for the database
# with backoff and holds a pg_advisory_lock, so two overlapping deploys queue
# instead of racing. Foreground and fatal on failure — serving against a stale
# schema is worse than restarting.
if [ "$run_migrations" = "true" ]; then
  echo "[entrypoint] role=$role — applying migrations"
  "$TSX_BIN" scripts/migrate.ts
fi

case "$role" in
  migrate)
    exit 0
    ;;
  app)
    echo "[entrypoint] role=app — starting web server"
    exec "$NEXT_BIN" start
    ;;
  worker)
    echo "[entrypoint] role=worker — starting background worker"
    exec "$TSX_BIN" scripts/worker.ts
    ;;
esac

# ── role=all: supervise the web server and the worker in one container ────────
echo "[entrypoint] role=all — starting web server and background worker"

"$NEXT_BIN" start &
web_pid=$!

"$TSX_BIN" scripts/worker.ts &
worker_pid=$!

shutting_down=false

shutdown() {
  if [ "$shutting_down" = true ]; then
    return
  fi
  shutting_down=true
  trap - TERM INT
  echo "[entrypoint] received $1; stopping web server and worker"
  # scripts/worker.ts traps SIGTERM and drains in-flight jobs, so give both
  # children a real TERM and wait.
  kill -TERM "$web_pid" "$worker_pid" 2>/dev/null || true
  wait "$web_pid" "$worker_pid" 2>/dev/null || true
  exit 0
}

trap 'shutdown SIGTERM' TERM
trap 'shutdown SIGINT' INT

# Take the whole container down when EITHER child exits. A container that kept
# answering /api/health with a dead worker would look healthy while every queued
# email and notification piled up unprocessed — exiting lets the platform's
# restart policy do its job. `|| code=$?` because `set -e` would otherwise abort
# here on a non-zero child and skip the sibling cleanup below.
code=0
wait -n "$web_pid" "$worker_pid" || code=$?

if [ "$shutting_down" = false ]; then
  echo "[entrypoint] a child process exited (status $code); shutting down the container"
  kill -TERM "$web_pid" "$worker_pid" 2>/dev/null || true
  wait "$web_pid" "$worker_pid" 2>/dev/null || true
fi

exit "$code"
