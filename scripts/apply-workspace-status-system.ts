// One-off: apply the is_system column, seed a Draft system status per
// workspace, and repair any posts already left with an orphaned status.
// Idempotent (IF NOT EXISTS / WHERE NOT EXISTS), non-destructive.
// Mirrors db/migrations/0027_workspace_status_system.sql.
// Run: pnpm tsx scripts/apply-workspace-status-system.ts
import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile();
}

async function main() {
  const { db, dbClient } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");

  await db.execute(
    sql`ALTER TABLE "workspace_statuses" ADD COLUMN IF NOT EXISTS "is_system" boolean NOT NULL DEFAULT false`
  );

  const before = (await db.execute(
    sql`SELECT count(*)::int AS count FROM "workspace_statuses" WHERE "is_system" = true`
  )) as unknown as { count: number }[];

  await db.execute(sql`
    INSERT INTO "workspace_statuses"
      ("id", "workspace_id", "name", "slug", "color", "display_order", "is_default", "is_archived", "show_on_roadmap", "show_on_public_feed", "is_system")
    SELECT
      concat('ws_', w.id, '_draft'),
      w.id, 'Draft', 'draft', '#6b7280', -1, false, false, false, false, true
    FROM "workspaces" w
    WHERE NOT EXISTS (
      SELECT 1 FROM "workspace_statuses" ws
      WHERE ws.workspace_id = w.id AND ws.slug = 'draft'
    )
  `);

  const after = (await db.execute(
    sql`SELECT count(*)::int AS count FROM "workspace_statuses" WHERE "is_system" = true`
  )) as unknown as { count: number }[];

  const repaired = (await db.execute(sql`
    UPDATE "posts" p
    SET "status" = 'draft', "updated_at" = now()
    WHERE NOT EXISTS (
      SELECT 1 FROM "workspace_statuses" ws
      WHERE ws.workspace_id = p.workspace_id AND ws.slug = p.status
    )
    RETURNING p.id
  `)) as unknown as { id: string }[];

  const seeded = (after[0]?.count ?? 0) - (before[0]?.count ?? 0);
  console.log(
    `✓ is_system column ready (Draft statuses seeded: ${seeded}; total system statuses now: ${after[0]?.count ?? 0}; orphaned posts repaired to Draft: ${repaired.length})`
  );
  await dbClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
