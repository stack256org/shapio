// Container HEALTHCHECK for the single Shapio image (see Dockerfile).
//
// The image runs as the web server, the worker, or both (SHAPIO_ROLE, see
// scripts/docker-entrypoint.sh). Only the web server can be probed: it answers
// GET /api/health with a real query against Postgres. The worker serves no HTTP
// and writes no heartbeat, so a worker-only container has nothing to check and
// reports healthy while its process is alive.
//
// docker-compose.yml disables the check on its worker service; this only
// decides the healthcheck for a platform that runs the image once.
const role = process.env.SHAPIO_ROLE || "all";

if (role === "worker" || role === "migrate") {
  process.exit(0);
}

try {
  // `next start` honours PORT, so probe whichever port it was given.
  const port = process.env.PORT || 3000;
  const res = await fetch(`http://127.0.0.1:${port}/api/health`);
  process.exit(res.ok ? 0 : 1);
} catch {
  process.exit(1);
}
