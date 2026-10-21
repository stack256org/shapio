-- Backs db/schema/posts.ts: posts.merged_into_id, set when a post has been
-- merged into another (see lib/posts/merge.ts). The column exists in the
-- schema and the drizzle snapshot (0016) but no migration SQL ever created it,
-- so a database built purely from these migrations failed every posts query.
-- Idempotent: databases that already have the column (built another way) are
-- left alone. Null for every post that was never merged.
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "merged_into_id" text;

DO $$ BEGIN
  ALTER TABLE "posts" ADD CONSTRAINT "posts_merged_into_id_posts_id_fk"
    FOREIGN KEY ("merged_into_id") REFERENCES "posts"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
