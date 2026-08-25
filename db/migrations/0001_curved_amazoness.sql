CREATE TYPE "public"."moderation_mode" AS ENUM('off', 'auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."workspace_member_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_member_role" NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo_url" text,
	"owner_id" text,
	"roadmap_public" boolean DEFAULT false NOT NULL,
	"changelog_public" boolean DEFAULT false NOT NULL,
	"moderation_mode" "moderation_mode" DEFAULT 'off' NOT NULL,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"suspended_at" timestamp with time zone,
	"suspended_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_workspace_user_unq" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_joined_at_idx" ON "workspace_members" USING btree ("user_id","joined_at");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_id_role_idx" ON "workspace_members" USING btree ("workspace_id","role");--> statement-breakpoint
CREATE INDEX "workspaces_owner_id_idx" ON "workspaces" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "workspaces_created_at_idx" ON "workspaces" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "boards_workspace_id_slug_unq" ON "boards" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "boards_workspace_id_archived_order_idx" ON "boards" USING btree ("workspace_id","is_archived","display_order");