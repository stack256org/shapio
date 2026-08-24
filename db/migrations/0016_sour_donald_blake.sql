CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_statuses" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text DEFAULT '#6b7280' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"show_on_roadmap" boolean DEFAULT false NOT NULL,
	"show_on_public_feed" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap_statuses" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6b7280' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap_items" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"status_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"launch_date" timestamp with time zone,
	"cover_image" text,
	"feedback_id" text,
	"sync_mode" text DEFAULT 'manual' NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
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
CREATE TABLE "comment_reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelog_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"cover_image_url" text,
	"label" text DEFAULT 'new_feature' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"notified_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelog_posts" (
	"changelog_entry_id" text NOT NULL,
	"post_id" text NOT NULL,
	CONSTRAINT "changelog_posts_changelog_entry_id_post_id_pk" PRIMARY KEY("changelog_entry_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "changelog_comment_reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelog_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"changelog_entry_id" text NOT NULL,
	"parent_id" text,
	"body" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"is_approved" boolean DEFAULT true NOT NULL,
	"author_id" text,
	"author_name" text,
	"author_avatar" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelog_entry_reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"changelog_entry_id" text NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelog_labels" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6b7280' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email_status_change" boolean DEFAULT true NOT NULL,
	"email_new_comment" boolean DEFAULT true NOT NULL,
	"email_changelog" boolean DEFAULT true NOT NULL,
	"in_app_status_change" boolean DEFAULT true NOT NULL,
	"in_app_new_comment" boolean DEFAULT true NOT NULL,
	"in_app_changelog" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "blocked_users" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text,
	"user_email" text,
	"user_name" text,
	"blocked_by" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_embed_config" (
	"workspace_id" text PRIMARY KEY NOT NULL,
	"board_id" text,
	"mode" text DEFAULT 'inline' NOT NULL,
	"position" text DEFAULT 'bottom-right' NOT NULL,
	"theme" text DEFAULT 'light' NOT NULL,
	"width" integer DEFAULT 380 NOT NULL,
	"height" integer DEFAULT 560 NOT NULL,
	"accent_color" text DEFAULT '#111111' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "feature_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"signup_enabled" boolean DEFAULT true NOT NULL,
	"max_workspaces_per_user" integer DEFAULT 5 NOT NULL,
	"maintenance_mode" boolean DEFAULT false NOT NULL,
	"maintenance_message" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "status" SET DEFAULT 'open';--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "workspace_id" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_name" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "entity_name" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "roadmap_sync_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "spam_keywords" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "category_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "assigned_to_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "is_approved" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "is_draft" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "merged_into_id" text;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_statuses" ADD CONSTRAINT "workspace_statuses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_statuses" ADD CONSTRAINT "roadmap_statuses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_status_id_roadmap_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."roadmap_statuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_feedback_id_posts_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_status_changes" ADD CONSTRAINT "post_status_changes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_status_changes" ADD CONSTRAINT "post_status_changes_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_posts" ADD CONSTRAINT "changelog_posts_changelog_entry_id_changelog_entries_id_fk" FOREIGN KEY ("changelog_entry_id") REFERENCES "public"."changelog_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_posts" ADD CONSTRAINT "changelog_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_comment_reactions" ADD CONSTRAINT "changelog_comment_reactions_comment_id_changelog_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."changelog_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_comment_reactions" ADD CONSTRAINT "changelog_comment_reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_comments" ADD CONSTRAINT "changelog_comments_changelog_entry_id_changelog_entries_id_fk" FOREIGN KEY ("changelog_entry_id") REFERENCES "public"."changelog_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_comments" ADD CONSTRAINT "changelog_comments_parent_id_changelog_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."changelog_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_comments" ADD CONSTRAINT "changelog_comments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_entry_reactions" ADD CONSTRAINT "changelog_entry_reactions_changelog_entry_id_changelog_entries_id_fk" FOREIGN KEY ("changelog_entry_id") REFERENCES "public"."changelog_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_entry_reactions" ADD CONSTRAINT "changelog_entry_reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_labels" ADD CONSTRAINT "changelog_labels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_followers" ADD CONSTRAINT "roadmap_followers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_followers" ADD CONSTRAINT "roadmap_followers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocked_by_user_id_fk" FOREIGN KEY ("blocked_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD CONSTRAINT "workspace_embed_config_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD CONSTRAINT "workspace_embed_config_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_email_changes" ADD CONSTRAINT "pending_email_changes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_workspace_slug_unq" ON "categories" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_workspace_name_unq" ON "categories" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "categories_workspace_id_idx" ON "categories" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "categories_workspace_order_idx" ON "categories" USING btree ("workspace_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_statuses_workspace_slug_unq" ON "workspace_statuses" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "workspace_statuses_workspace_id_idx" ON "workspace_statuses" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_statuses_workspace_order_idx" ON "workspace_statuses" USING btree ("workspace_id","display_order");--> statement-breakpoint
CREATE INDEX "roadmap_statuses_workspace_id_idx" ON "roadmap_statuses" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "roadmap_statuses_workspace_order_idx" ON "roadmap_statuses" USING btree ("workspace_id","display_order");--> statement-breakpoint
CREATE INDEX "roadmap_items_workspace_id_idx" ON "roadmap_items" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "roadmap_items_status_order_idx" ON "roadmap_items" USING btree ("status_id","display_order");--> statement-breakpoint
CREATE INDEX "roadmap_items_feedback_id_idx" ON "roadmap_items" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX "post_status_changes_post_id_idx" ON "post_status_changes" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "comment_reactions_comment_id_idx" ON "comment_reactions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "comment_reactions_user_id_idx" ON "comment_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "changelog_entries_workspace_id_idx" ON "changelog_entries" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "changelog_entries_workspace_published_idx" ON "changelog_entries" USING btree ("workspace_id","is_published","published_at");--> statement-breakpoint
CREATE INDEX "changelog_entries_created_by_idx" ON "changelog_entries" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "changelog_posts_post_id_idx" ON "changelog_posts" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "changelog_comment_reactions_comment_id_idx" ON "changelog_comment_reactions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "changelog_comment_reactions_user_id_idx" ON "changelog_comment_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "changelog_comments_entry_id_idx" ON "changelog_comments" USING btree ("changelog_entry_id");--> statement-breakpoint
CREATE INDEX "changelog_comments_author_id_idx" ON "changelog_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "changelog_comments_parent_id_idx" ON "changelog_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "changelog_entry_reactions_entry_id_idx" ON "changelog_entry_reactions" USING btree ("changelog_entry_id");--> statement-breakpoint
CREATE INDEX "changelog_entry_reactions_user_id_idx" ON "changelog_entry_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "changelog_labels_workspace_name_unq" ON "changelog_labels" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "changelog_labels_workspace_id_idx" ON "changelog_labels" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_workspace_id_idx" ON "notifications" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roadmap_followers_workspace_user_unq" ON "roadmap_followers" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "roadmap_followers_workspace_idx" ON "roadmap_followers" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "blocked_users_workspace_id_idx" ON "blocked_users" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "blocked_users_user_id_idx" ON "blocked_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "blocked_users_user_email_idx" ON "blocked_users" USING btree ("user_email");--> statement-breakpoint
CREATE UNIQUE INDEX "pending_email_changes_token_unq" ON "pending_email_changes" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "pending_email_changes_user_id_unq" ON "pending_email_changes" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_assigned_to_id_user_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_merged_into_id_posts_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_created_at_idx" ON "audit_logs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "posts_assigned_to_id_idx" ON "posts" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "posts_category_id_idx" ON "posts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "posts_workspace_id_is_draft_idx" ON "posts" USING btree ("workspace_id","is_draft");--> statement-breakpoint
DROP TYPE "public"."post_status";