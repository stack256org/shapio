CREATE TABLE "portal_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"smtp_host" text,
	"smtp_port" integer,
	"smtp_user" text,
	"smtp_pass_encrypted" text,
	"email_from" text,
	"google_client_id" text,
	"google_client_secret_encrypted" text,
	"email_webhook_secret_encrypted" text,
	"storage_s3_region" text,
	"storage_s3_bucket" text,
	"storage_s3_access_key_id" text,
	"storage_s3_secret_access_key_encrypted" text,
	"storage_s3_endpoint" text,
	"storage_public_url_base" text,
	"storage_local_dir" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "requires_integration_setup" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_statuses" ADD COLUMN "is_system" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "merged_from_post_id" text;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD COLUMN "button_type" text DEFAULT 'floating' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD COLUMN "floating_position" text DEFAULT 'bottom-right' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD COLUMN "floating_icon_type" text DEFAULT 'logo' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD COLUMN "floating_icon_url" text;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD COLUMN "sticky_button_text" text DEFAULT 'Leave Feedback' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD COLUMN "sticky_button_color" text DEFAULT '#111111' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD COLUMN "sticky_text_color" text DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD COLUMN "sticky_position" text DEFAULT 'right-middle' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD COLUMN "device_visibility" jsonb DEFAULT '{"desktop":true,"mobile":true,"tablet":true}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD COLUMN "show_roadmap" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD COLUMN "show_changelog" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD COLUMN "show_submit_form_immediately" text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD COLUMN "show_similar_posts" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" ADD COLUMN "show_view_other_feedback_button" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "portal_verifications_email_unq" ON "portal_verifications" USING btree ("email");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_merged_from_post_id_posts_id_fk" FOREIGN KEY ("merged_from_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_embed_config" DROP COLUMN "mode";--> statement-breakpoint
ALTER TABLE "workspace_embed_config" DROP COLUMN "position";