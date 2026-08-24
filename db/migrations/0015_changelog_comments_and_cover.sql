ALTER TABLE "changelog_entries" ADD COLUMN "cover_image_url" text;--> statement-breakpoint
CREATE TABLE "changelog_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"changelog_entry_id" text NOT NULL,
	"body" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
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
ALTER TABLE "changelog_comments" ADD CONSTRAINT "changelog_comments_changelog_entry_id_changelog_entries_id_fk" FOREIGN KEY ("changelog_entry_id") REFERENCES "public"."changelog_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_comments" ADD CONSTRAINT "changelog_comments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_entry_reactions" ADD CONSTRAINT "changelog_entry_reactions_changelog_entry_id_changelog_entries_id_fk" FOREIGN KEY ("changelog_entry_id") REFERENCES "public"."changelog_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_entry_reactions" ADD CONSTRAINT "changelog_entry_reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "changelog_comments_entry_id_idx" ON "changelog_comments" USING btree ("changelog_entry_id");--> statement-breakpoint
CREATE INDEX "changelog_comments_author_id_idx" ON "changelog_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "changelog_entry_reactions_entry_id_idx" ON "changelog_entry_reactions" USING btree ("changelog_entry_id");--> statement-breakpoint
CREATE INDEX "changelog_entry_reactions_user_id_idx" ON "changelog_entry_reactions" USING btree ("user_id");
