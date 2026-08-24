-- Backfill default categories (Feature Request / Bug / Improvement) for existing
-- workspaces that currently have NONE. New workspaces get these via
-- seedDefaultCategories() at creation; this covers workspaces created before that.
--
-- A single INSERT ... SELECT so the "has no categories" test is evaluated once
-- per workspace against the pre-insert snapshot (three separate INSERTs would
-- see the first insert and skip the rest). Workspaces that already have any
-- category (e.g. an admin created their own) are left untouched. ON CONFLICT DO
-- NOTHING makes the statement safe to re-run.
INSERT INTO "categories" ("id", "workspace_id", "name", "slug", "color", "display_order")
SELECT
  concat('ws_', w.id, '_cat_', d.slug),
  w.id, d.name, d.slug, d.color, d.display_order
FROM "workspaces" w
CROSS JOIN (VALUES
  ('Feature Request', 'feature-request', '#6366f1', 0),
  ('Bug', 'bug', '#ef4444', 1),
  ('Improvement', 'improvement', '#22c55e', 2)
) AS d(name, slug, color, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM "categories" c WHERE c.workspace_id = w.id
)
ON CONFLICT DO NOTHING;
