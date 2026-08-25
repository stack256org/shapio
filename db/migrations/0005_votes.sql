-- Migrate from post_votes to votes table

-- Step 1: Create the new votes table
CREATE TABLE "votes" (
  "id" text PRIMARY KEY NOT NULL,
  "post_id" text NOT NULL,
  "workspace_id" text NOT NULL,
  "user_id" text,
  "user_email" text,
  "user_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Step 2: Add foreign key constraints
ALTER TABLE "votes" ADD CONSTRAINT "votes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- Step 3: Migrate existing post_votes data into votes
-- Get workspace_id from posts table
INSERT INTO "votes" ("id", "post_id", "workspace_id", "user_id", "created_at")
SELECT pv.id, pv.post_id, p.workspace_id, pv.user_id, pv.created_at
FROM "post_votes" pv
JOIN "posts" p ON p.id = pv.post_id;
--> statement-breakpoint

-- Step 4: Create regular indexes
CREATE INDEX "votes_post_id_idx" ON "votes" ("post_id");
--> statement-breakpoint
CREATE INDEX "votes_user_id_idx" ON "votes" ("user_id");
--> statement-breakpoint
CREATE INDEX "votes_workspace_id_idx" ON "votes" ("workspace_id");
--> statement-breakpoint
CREATE INDEX "votes_post_id_user_id_idx" ON "votes" ("post_id", "user_id");
--> statement-breakpoint
CREATE INDEX "votes_post_id_user_email_idx" ON "votes" ("post_id", "user_email");
--> statement-breakpoint

-- Step 5: Add partial unique indexes (Drizzle ORM does not support these declaratively)
CREATE UNIQUE INDEX "votes_post_id_user_id_unq" ON "votes" ("post_id", "user_id") WHERE "user_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "votes_post_id_user_email_unq" ON "votes" ("post_id", "user_email") WHERE "user_email" IS NOT NULL;
--> statement-breakpoint

-- Step 6: Drop the old post_votes table
DROP TABLE "post_votes";
