// One-off: apply the is_draft column + index to the connected database.
// Idempotent (IF NOT EXISTS), non-destructive. Mirrors db/migrations/0016_post_draft.sql.
// Run: pnpm tsx scripts/apply-post-draft.ts
import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile();
}

async function main() {
  const { db, dbClient } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");

  await db.execute(
    sql`ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "is_draft" boolean DEFAULT false NOT NULL`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "posts_workspace_id_is_draft_idx" ON "posts" USING btree ("workspace_id","is_draft")`
  );

  const [{ count }] = (await db.execute(
    sql`SELECT count(*)::int AS count FROM "posts" WHERE "is_draft" = false`
  )) as unknown as { count: number }[];

  console.log(
    `✓ is_draft column ready (existing posts marked not-draft: ${count})`
  );
  await dbClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
