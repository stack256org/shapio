-- Every post always has a category now (no more "No category"). This adds
-- the one auto-assigned default per workspace — mirrors the isDefault
-- pattern workspace_statuses already uses — and backfills:
--   1. One existing category per workspace becomes the default (earliest by
--      display_order, then created_at). Workspaces with zero active
--      categories are left alone — there's nothing to default to yet.
--   2. Any pre-existing post with no category gets its workspace's new
--      default category.

ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "is_default" boolean DEFAULT false NOT NULL;

WITH first_active AS (
  SELECT DISTINCT ON (workspace_id) id, workspace_id
  FROM categories
  WHERE is_archived = false
  ORDER BY workspace_id, display_order ASC, created_at ASC
)
UPDATE categories
SET is_default = true
WHERE id IN (SELECT id FROM first_active)
  AND NOT EXISTS (
    SELECT 1 FROM categories c2
    WHERE c2.workspace_id = categories.workspace_id AND c2.is_default = true
  );

UPDATE posts
SET category_id = (
  SELECT id FROM categories
  WHERE categories.workspace_id = posts.workspace_id
    AND categories.is_default = true
  LIMIT 1
)
WHERE category_id IS NULL
  AND EXISTS (
    SELECT 1 FROM categories
    WHERE categories.workspace_id = posts.workspace_id
      AND categories.is_default = true
  );
