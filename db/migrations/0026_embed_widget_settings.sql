-- Feedback widget redesign (Phase 4): replaces the old inline-vs-button
-- `mode` with exactly two button types (Floating/Sticky), plus per-type
-- fields, device visibility, and the new General Options toggles.
--
-- Every existing config becomes a Floating Button regardless of its old
-- `mode` value (inline mode is removed entirely, not migrated to a
-- runtime code path) — button_type's own column default handles this for
-- every existing row. floating_position DOES carry the old `position`
-- value forward, since that preference is still meaningful for a Floating
-- Button. `mode` and `position` are then dropped — no lingering columns,
-- no dead branches reading them.

ALTER TABLE "workspace_embed_config" ADD COLUMN IF NOT EXISTS "button_type" text DEFAULT 'floating' NOT NULL;
ALTER TABLE "workspace_embed_config" ADD COLUMN IF NOT EXISTS "floating_position" text DEFAULT 'bottom-right' NOT NULL;
ALTER TABLE "workspace_embed_config" ADD COLUMN IF NOT EXISTS "floating_icon_type" text DEFAULT 'logo' NOT NULL;
ALTER TABLE "workspace_embed_config" ADD COLUMN IF NOT EXISTS "floating_icon_url" text;
ALTER TABLE "workspace_embed_config" ADD COLUMN IF NOT EXISTS "sticky_button_text" text DEFAULT 'Leave Feedback' NOT NULL;
ALTER TABLE "workspace_embed_config" ADD COLUMN IF NOT EXISTS "sticky_button_color" text DEFAULT '#111111' NOT NULL;
ALTER TABLE "workspace_embed_config" ADD COLUMN IF NOT EXISTS "sticky_text_color" text DEFAULT '#ffffff' NOT NULL;
ALTER TABLE "workspace_embed_config" ADD COLUMN IF NOT EXISTS "sticky_position" text DEFAULT 'right-middle' NOT NULL;
ALTER TABLE "workspace_embed_config" ADD COLUMN IF NOT EXISTS "device_visibility" jsonb DEFAULT '{"desktop":true,"mobile":true,"tablet":true}'::jsonb NOT NULL;
ALTER TABLE "workspace_embed_config" ADD COLUMN IF NOT EXISTS "show_roadmap" boolean DEFAULT true NOT NULL;
ALTER TABLE "workspace_embed_config" ADD COLUMN IF NOT EXISTS "show_changelog" boolean DEFAULT true NOT NULL;
ALTER TABLE "workspace_embed_config" ADD COLUMN IF NOT EXISTS "show_submit_form_immediately" text DEFAULT 'auto' NOT NULL;
ALTER TABLE "workspace_embed_config" ADD COLUMN IF NOT EXISTS "show_similar_posts" boolean DEFAULT true NOT NULL;
ALTER TABLE "workspace_embed_config" ADD COLUMN IF NOT EXISTS "show_view_other_feedback_button" boolean DEFAULT true NOT NULL;

UPDATE "workspace_embed_config" SET "floating_position" = "position" WHERE "position" IS NOT NULL;

ALTER TABLE "workspace_embed_config" DROP COLUMN IF EXISTS "mode";
ALTER TABLE "workspace_embed_config" DROP COLUMN IF EXISTS "position";
