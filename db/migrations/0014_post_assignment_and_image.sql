ALTER TABLE "posts" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "assigned_to_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_assigned_to_id_user_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_assigned_to_id_idx" ON "posts" USING btree ("assigned_to_id");
