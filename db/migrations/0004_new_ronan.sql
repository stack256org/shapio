CREATE TABLE "post_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"author_id" text,
	"author_name" text,
	"author_email" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "status" SET DEFAULT 'open'::text;--> statement-breakpoint
UPDATE "posts" SET "status" = 'completed' WHERE "status" = 'done';--> statement-breakpoint
UPDATE "posts" SET "status" = 'closed' WHERE "status" = 'declined';--> statement-breakpoint
UPDATE "posts" SET "status" = 'open' WHERE "status" = 'under_review';--> statement-breakpoint
DROP TYPE "public"."post_status";--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('open', 'planned', 'in_progress', 'completed', 'closed');--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."post_status";--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "status" SET DATA TYPE "public"."post_status" USING "status"::"public"."post_status";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "posts" SET "slug" = "id" WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "post_votes" ADD CONSTRAINT "post_votes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_votes" ADD CONSTRAINT "post_votes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "post_votes_post_id_user_id_unq" ON "post_votes" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "post_votes_user_id_idx" ON "post_votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "post_comments_post_id_created_at_idx" ON "post_comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "post_comments_author_id_idx" ON "post_comments" USING btree ("author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_board_id_slug_unq" ON "posts" USING btree ("board_id","slug");
