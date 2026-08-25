CREATE TABLE "workspace_invite_links" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by_id" text,
	"role" "workspace_member_role" NOT NULL,
	"token" text NOT NULL,
	"label" text,
	"max_uses" integer,
	"use_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_invite_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "workspace_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"invited_by_id" text,
	"email" text NOT NULL,
	"role" "workspace_member_role" NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "workspace_invite_links" ADD CONSTRAINT "workspace_invite_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invite_links" ADD CONSTRAINT "workspace_invite_links_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_invited_by_id_user_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_invite_links_workspace_active_idx" ON "workspace_invite_links" USING btree ("workspace_id","is_active");--> statement-breakpoint
CREATE INDEX "workspace_invites_workspace_email_idx" ON "workspace_invites" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "workspace_invites_workspace_state_idx" ON "workspace_invites" USING btree ("workspace_id","accepted_at","revoked_at");--> statement-breakpoint
CREATE INDEX "workspace_invites_email_state_idx" ON "workspace_invites" USING btree ("email","accepted_at","revoked_at");