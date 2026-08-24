CREATE TYPE "public"."post_status" AS ENUM('open', 'under_review', 'planned', 'in_progress', 'done', 'declined');--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"status" "post_status" DEFAULT 'open' NOT NULL,
	"author_id" text,
	"author_name" text,
	"author_email" text NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_board_id_created_at_idx" ON "posts" USING btree ("board_id","created_at");--> statement-breakpoint
CREATE INDEX "posts_board_id_upvotes_idx" ON "posts" USING btree ("board_id","upvotes");--> statement-breakpoint
CREATE INDEX "posts_board_id_status_idx" ON "posts" USING btree ("board_id","status");--> statement-breakpoint
CREATE INDEX "posts_author_id_idx" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "posts_workspace_id_created_at_idx" ON "posts" USING btree ("workspace_id","created_at");