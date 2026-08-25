-- post_status_changes, roadmap_followers, pending_email_changes and
-- workspace_embed_config were the only tables this migration ever added that
-- no later-numbered migration also creates (0024/0026 only ALTER
-- workspace_embed_config — nothing else CREATEs it). Everything else this
-- file originally contained (categories, workspace_statuses, roadmap_statuses
-- /items, comment_reactions, changelog_*, notifications, blocked_users,
-- feature_flags, platform_settings, and several posts/audit_logs/workspaces
-- columns) was a duplicate snapshot of migrations 0007-0028, generated
-- against a stale journal — applying it verbatim after those migrations
-- already ran fails with "relation already exists". Trimmed to just the
-- unique tables; workspace_embed_config is created here WITHOUT board_id,
-- since adding that column (with its own FK) is 0024's job.
CREATE TABLE "workspace_embed_config" (
	"workspace_id" text PRIMARY KEY NOT NULL,
	"mode" text DEFAULT 'inline' NOT NULL,
	"position" text DEFAULT 'bottom-right' NOT NULL,
	"theme" text DEFAULT 'light' NOT NULL,
	"width" integer DEFAULT 380 NOT NULL,
	"height" integer DEFAULT 560 NOT NULL,
	"accent_color" text DEFAULT '#111111' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_status_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_by" text,
	"changed_by_name" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap_followers" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_email_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"new_email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD CONSTRAINT "workspace_embed_config_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_status_changes" ADD CONSTRAINT "post_status_changes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_status_changes" ADD CONSTRAINT "post_status_changes_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_followers" ADD CONSTRAINT "roadmap_followers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_followers" ADD CONSTRAINT "roadmap_followers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_email_changes" ADD CONSTRAINT "pending_email_changes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_status_changes_post_id_idx" ON "post_status_changes" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "roadmap_followers_workspace_user_unq" ON "roadmap_followers" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "roadmap_followers_workspace_idx" ON "roadmap_followers" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pending_email_changes_token_unq" ON "pending_email_changes" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "pending_email_changes_user_id_unq" ON "pending_email_changes" USING btree ("user_id");
