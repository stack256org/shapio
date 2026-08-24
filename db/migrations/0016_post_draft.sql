-- Save-as-Draft for feedback posts.
-- A draft is an unpublished post: saved by a workspace member but hidden from
-- every public/output surface (portal, roadmap, changelog, public API) until it
-- is published. Idempotent so it is safe to re-run.
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "is_draft" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_workspace_id_is_draft_idx" ON "posts" USING btree ("workspace_id","is_draft");
