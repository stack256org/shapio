-- Feature 07: Comments

-- Step 1: Add comment_count to posts
ALTER TABLE "posts" ADD COLUMN "comment_count" integer NOT NULL DEFAULT 0;
--> statement-breakpoint

-- Step 2: Add comment_moderation to workspaces
ALTER TABLE "workspaces" ADD COLUMN "comment_moderation" boolean NOT NULL DEFAULT false;
--> statement-breakpoint

-- Step 3: Create new comments table
CREATE TABLE "comments" (
  "id" text PRIMARY KEY NOT NULL,
  "post_id" text NOT NULL,
  "parent_id" text,
  "body" text NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT false,
  "is_approved" boolean NOT NULL DEFAULT true,
  "author_id" text,
  "author_email" text,
  "author_name" text,
  "author_avatar" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Step 4: Add foreign keys
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk"
  FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_user_id_fk"
  FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- Step 5: Migrate data from post_comments to comments
INSERT INTO "comments" (
  "id", "post_id", "body", "is_deleted", "is_approved",
  "author_id", "author_email", "author_name",
  "created_at", "updated_at"
)
SELECT
  id, post_id, content, false, true,
  author_id, author_email, author_name,
  created_at, updated_at
FROM "post_comments";
--> statement-breakpoint

-- Step 6: Backfill comment_count on posts from migrated data
UPDATE "posts" p
SET "comment_count" = (
  SELECT COUNT(*)
  FROM "comments" c
  WHERE c.post_id = p.id
    AND c.is_approved = true
    AND c.is_deleted = false
);
--> statement-breakpoint

-- Step 7: Create indexes
CREATE INDEX "comments_post_id_idx" ON "comments" ("post_id");
--> statement-breakpoint
CREATE INDEX "comments_parent_id_idx" ON "comments" ("parent_id");
--> statement-breakpoint
CREATE INDEX "comments_author_id_idx" ON "comments" ("author_id");
--> statement-breakpoint
CREATE INDEX "comments_post_id_approved_deleted_idx" ON "comments" ("post_id", "is_approved", "is_deleted");
--> statement-breakpoint

-- Step 8: Drop old post_comments table
DROP TABLE "post_comments";
