import postgres from "postgres";
import { env } from "@/lib/env";

// Destructive: drops every table. Refuse to run against anything that looks
// like a production database, and require explicit opt-in via a --confirm
// flag so it can never be triggered accidentally (e.g. from another script).
// A CLI flag (rather than an inline env var like CONFIRM_RESET=1 tsx ...) is
// deliberate: that assignment syntax is POSIX-shell-only, so on Windows,
// `pnpm run` — which invokes scripts through cmd.exe, even from Git Bash —
// fails with "'CONFIRM_RESET' is not recognized...". A flag works the same
// in every shell.
if (env.NODE_ENV === "production") {
  throw new Error("db/reset.ts refuses to run with NODE_ENV=production.");
}
if (!process.argv.includes("--confirm")) {
  throw new Error(
    `db/reset.ts will DROP ALL DATA in ${env.DATABASE_URL}. ` +
      "Re-run with --confirm if you are sure."
  );
}

const sql = postgres(env.DATABASE_URL);

console.log("Dropping public and drizzle schemas...");
await sql`DROP SCHEMA public CASCADE`;
await sql`CREATE SCHEMA public`;
await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
await sql.end();
console.log("Database reset complete.");
