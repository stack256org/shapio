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
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications" USING btree ("user_id","is_read");
--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX "notifications_workspace_id_idx" ON "notifications" USING btree ("workspace_id");
