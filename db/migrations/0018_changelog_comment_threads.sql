-- Changelog comments: threaded replies + moderation + per-comment reactions.
-- Brings changelog comments to feature parity with feedback comments.

ALTER TABLE "changelog_comments"
  ADD COLUMN IF NOT EXISTS "parent_id" text;

ALTER TABLE "changelog_comments"
  ADD COLUMN IF NOT EXISTS "is_approved" boolean DEFAULT true NOT NULL;

DO $$ BEGIN
  ALTER TABLE "changelog_comments"
    ADD CONSTRAINT "changelog_comments_parent_id_changelog_comments_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "changelog_comments"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "changelog_comments_parent_id_idx"
  ON "changelog_comments" USING btree ("parent_id");

CREATE TABLE IF NOT EXISTS "changelog_comment_reactions" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL,
  "user_id" text,
  "emoji" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "changelog_comment_reactions"
    ADD CONSTRAINT "changelog_comment_reactions_comment_id_changelog_comments_id_fk"
    FOREIGN KEY ("comment_id") REFERENCES "changelog_comments"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "changelog_comment_reactions"
    ADD CONSTRAINT "changelog_comment_reactions_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "changelog_comment_reactions_comment_id_idx"
  ON "changelog_comment_reactions" USING btree ("comment_id");

CREATE INDEX IF NOT EXISTS "changelog_comment_reactions_user_id_idx"
  ON "changelog_comment_reactions" USING btree ("user_id");
