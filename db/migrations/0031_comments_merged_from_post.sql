-- Backs db/schema/comments.ts: comments.merged_from_post_id, set only on the
-- auto-generated "merged feedback" summary comment mergePost adds to the
-- target post (see lib/posts/merge.ts). Lets unmergePost find and remove
-- that one synthetic comment without touching real ones. Null for every
-- ordinary comment.
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "merged_from_post_id" text;

DO $$ BEGIN
  ALTER TABLE "comments" ADD CONSTRAINT "comments_merged_from_post_id_posts_id_fk"
    FOREIGN KEY ("merged_from_post_id") REFERENCES "posts"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
