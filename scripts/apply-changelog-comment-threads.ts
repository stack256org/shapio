// One-off: apply threaded-reply + moderation + per-comment-reaction support to
// changelog_comments on the connected database. Idempotent (IF NOT EXISTS /
// duplicate_object guards), non-destructive. Mirrors
// db/migrations/0018_changelog_comment_threads.sql.
// Run: pnpm tsx scripts/apply-changelog-comment-threads.ts
import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile();
}

async function main() {
  const { db, dbClient } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");

  await db.execute(
    sql`ALTER TABLE "changelog_comments" ADD COLUMN IF NOT EXISTS "parent_id" text`
  );
  await db.execute(
    sql`ALTER TABLE "changelog_comments" ADD COLUMN IF NOT EXISTS "is_approved" boolean DEFAULT true NOT NULL`
  );
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "changelog_comments"
        ADD CONSTRAINT "changelog_comments_parent_id_changelog_comments_id_fk"
        FOREIGN KEY ("parent_id") REFERENCES "changelog_comments"("id") ON DELETE cascade;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "changelog_comments_parent_id_idx" ON "changelog_comments" USING btree ("parent_id")`
  );

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "changelog_comment_reactions" (
      "id" text PRIMARY KEY NOT NULL,
      "comment_id" text NOT NULL,
      "user_id" text,
      "emoji" text NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "changelog_comment_reactions"
        ADD CONSTRAINT "changelog_comment_reactions_comment_id_changelog_comments_id_fk"
        FOREIGN KEY ("comment_id") REFERENCES "changelog_comments"("id") ON DELETE cascade;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "changelog_comment_reactions"
        ADD CONSTRAINT "changelog_comment_reactions_user_id_user_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE set null;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "changelog_comment_reactions_comment_id_idx" ON "changelog_comment_reactions" USING btree ("comment_id")`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "changelog_comment_reactions_user_id_idx" ON "changelog_comment_reactions" USING btree ("user_id")`
  );

  const [{ count }] = (await db.execute(
    sql`SELECT count(*)::int AS count FROM "changelog_comments"`
  )) as unknown as { count: number }[];

  console.log(
    `✓ changelog_comments threaded/moderation/reactions ready (existing comments: ${count})`
  );
  await dbClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
