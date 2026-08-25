// One-off: backfill default categories for existing workspaces that have none.
// Idempotent (WHERE NOT EXISTS + ON CONFLICT DO NOTHING), non-destructive.
// Mirrors db/migrations/0017_default_categories.sql.
// Run: pnpm tsx scripts/apply-default-categories.ts
import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile();
}

async function main() {
  const { db, dbClient } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");

  const before = (await db.execute(
    sql`SELECT count(*)::int AS count FROM "categories"`
  )) as unknown as { count: number }[];

  await db.execute(sql`
    INSERT INTO "categories" ("id", "workspace_id", "name", "slug", "color", "display_order")
    SELECT
      concat('ws_', w.id, '_cat_', d.slug),
      w.id, d.name, d.slug, d.color, d.display_order
    FROM "workspaces" w
    CROSS JOIN (VALUES
      ('Feature Request', 'feature-request', '#6366f1', 0),
      ('Bug', 'bug', '#ef4444', 1),
      ('Improvement', 'improvement', '#22c55e', 2)
    ) AS d(name, slug, color, display_order)
    WHERE NOT EXISTS (
      SELECT 1 FROM "categories" c WHERE c.workspace_id = w.id
    )
    ON CONFLICT DO NOTHING
  `);

  const after = (await db.execute(
    sql`SELECT count(*)::int AS count FROM "categories"`
  )) as unknown as { count: number }[];

  const inserted = (after[0]?.count ?? 0) - (before[0]?.count ?? 0);
  console.log(
    `✓ default categories backfilled (rows inserted: ${inserted}; total categories now: ${after[0]?.count ?? 0})`
  );
  await dbClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
