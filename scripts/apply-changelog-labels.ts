// One-off: create the changelog_labels table (+ indexes, FK) and backfill any
// custom labels already used on entries. Idempotent, non-destructive. Mirrors
// db/migrations/0019_changelog_labels.sql.
// Run: pnpm tsx scripts/apply-changelog-labels.ts
import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile();
}

async function main() {
  const { db, dbClient } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "changelog_labels" (
      "id" text PRIMARY KEY NOT NULL,
      "workspace_id" text NOT NULL,
      "name" text NOT NULL,
      "color" text DEFAULT '#6b7280' NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "changelog_labels"
        ADD CONSTRAINT "changelog_labels_workspace_id_workspaces_id_fk"
        FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS "changelog_labels_workspace_name_unq" ON "changelog_labels" USING btree ("workspace_id","name")`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "changelog_labels_workspace_id_idx" ON "changelog_labels" USING btree ("workspace_id")`
  );

  await db.execute(sql`
    INSERT INTO "changelog_labels" ("id", "workspace_id", "name")
    SELECT md5(random()::text || clock_timestamp()::text), "workspace_id", "label"
    FROM (
      SELECT DISTINCT "workspace_id", "label"
      FROM "changelog_entries"
      WHERE "label" IS NOT NULL
        AND "label" <> ''
        AND "label" NOT IN ('new_feature','improvement','bug_fix','security','deprecation')
    ) AS distinct_labels
    ON CONFLICT ("workspace_id","name") DO NOTHING
  `);

  const [{ count }] = (await db.execute(
    sql`SELECT count(*)::int AS count FROM "changelog_labels"`
  )) as unknown as { count: number }[];

  console.log(`✓ changelog_labels ready (total labels: ${count})`);
  await dbClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
