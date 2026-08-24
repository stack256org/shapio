import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Dedicated config for the test harness's schema push.
//
// WHY THIS EXISTS: `drizzle-kit` auto-loads `.env` from the cwd and lets it
// override the process env it was spawned with — so passing DATABASE_URL (or any
// env var) to the drizzle-kit child, as tests/setup/global-setup.ts does, is
// silently ignored and drizzle-kit reconnects to the DEV database from `.env`.
// With `push --force` that ran destructive DDL against the dev DB and wiped it.
//
// To be immune to that, we read the test database URL DIRECTLY from `.env.test`
// on disk (not from process.env, which drizzle-kit rewrites), and hard-refuse
// anything that isn't the ephemeral test database.
function testDatabaseUrl(): string {
  let raw: string;
  try {
    raw = readFileSync(".env.test", "utf8");
  } catch {
    throw new Error("drizzle-test.config.ts: .env.test not found.");
  }
  const match = raw.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
  const url = match?.[1]?.trim().replace(/^["']|["']$/g, "");
  if (!url?.includes("shapio_test")) {
    throw new Error(
      "drizzle-test.config.ts: .env.test DATABASE_URL must target the " +
        `ephemeral test database (…/shapio_test). Got: ${url ?? "unset"}. ` +
        "Refusing to run a --force schema push against a non-test database."
    );
  }
  return url;
}

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: testDatabaseUrl() },
});
