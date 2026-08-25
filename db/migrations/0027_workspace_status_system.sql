-- Protected "system" statuses: a built-in, undeletable/unarchivable "Draft"
-- status per workspace that posts are moved to when their actual status is
-- deleted, so no post ever references a status that no longer exists.
--> statement-breakpoint

ALTER TABLE "workspace_statuses" ADD COLUMN IF NOT EXISTS "is_system" boolean NOT NULL DEFAULT false;
--> statement-breakpoint

-- Seed a system "Draft" status for every existing workspace. Guarded so this
-- is safe to run once and skips any workspace that already happens to have a
-- custom status slugged "draft" (rare — that one workspace just won't get an
-- additional system row).
INSERT INTO "workspace_statuses"
  ("id", "workspace_id", "name", "slug", "color", "display_order", "is_default", "is_archived", "show_on_roadmap", "show_on_public_feed", "is_system")
SELECT
  concat('ws_', w.id, '_draft'),
  w.id, 'Draft', 'draft', '#6b7280', -1, false, false, false, false, true
FROM "workspaces" w
WHERE NOT EXISTS (
  SELECT 1 FROM "workspace_statuses" ws
  WHERE ws.workspace_id = w.id AND ws.slug = 'draft'
);
--> statement-breakpoint

-- Repair pass: move any post already left with an orphaned status (from a
-- status deleted before this fix existed) to its workspace's Draft, so "no
-- orphaned status references" holds for existing data too, not just future
-- deletions.
UPDATE "posts" p
SET "status" = 'draft', "updated_at" = now()
WHERE NOT EXISTS (
  SELECT 1 FROM "workspace_statuses" ws
  WHERE ws.workspace_id = p.workspace_id AND ws.slug = p.status
);
