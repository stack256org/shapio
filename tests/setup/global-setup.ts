import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import EmbeddedPostgres from "embedded-postgres";

const execFileAsync = promisify(execFile);

// Runs once before the whole test run: spins up a fresh, ephemeral Postgres
// instance dedicated to tests (separate port/data dir from the dev database),
// creates the test database, and syncs its schema — so `pnpm test` works
// standalone with no manual setup, in local dev or CI alike.
export default async function globalSetup() {
  // Same override as vitest.config.ts (this runs in its own process, so it
  // needs its own copy of that fix): clear these first so .env.test's values
  // always win, even when the parent job already set its own DATABASE_URL.
  if (existsSync(".env.test")) {
    for (const key of [
      "DATABASE_URL",
      "APP_SECRET",
      "NEXT_PUBLIC_APP_URL",
      "NODE_ENV",
      "ENCRYPTION_KEY",
    ]) {
      delete process.env[key];
    }
    process.loadEnvFile(".env.test");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set (expected from .env.test).");
  }

  const url = new URL(databaseUrl);
  const user = decodeURIComponent(url.username) || "postgres";
  const password = decodeURIComponent(url.password) || "password";
  const port = Number(url.port) || 54_350;
  const database = url.pathname.replace(/^\//, "") || "shapio_test";
  const dataDir = path.resolve(process.cwd(), ".shapio-postgres-test");

  // Always start from a clean data directory so test runs never inherit state
  // from a previous run that wasn't shut down cleanly.
  if (existsSync(dataDir)) {
    await rm(dataDir, { recursive: true, force: true });
  }

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user,
    password,
    port,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase(database);

  // Sync the schema directly from db/schema/*.ts (drizzle-kit push), rather
  // than replaying db/migrations/*.sql — push is instant and doesn't require
  // stepping through migration history, which is what actually matters here:
  // this suite only cares about the current schema shape, not how it was
  // reached. (The "migrations apply cleanly" CI job separately verifies the
  // migration history itself replays correctly on a fresh database.)
  //
  // CRITICAL: drizzle-kit auto-loads `.env` and lets it OVERRIDE the env it is
  // spawned with, so passing DATABASE_URL here is silently ignored — drizzle-kit
  // would push (with --force) against the DEV database from `.env` and wipe it.
  // We use drizzle-test.config.ts, which reads the URL DIRECTLY from `.env.test`
  // on disk (immune to drizzle-kit's env rewriting) and hard-refuses any
  // database that isn't the ephemeral …/shapio_test one.
  await execFileAsync(
    "npx",
    ["drizzle-kit", "push", "--config=drizzle-test.config.ts", "--force"],
    { cwd: process.cwd() }
  );

  return async () => {
    await pg.stop();
    await rm(dataDir, { recursive: true, force: true });
  };
}
