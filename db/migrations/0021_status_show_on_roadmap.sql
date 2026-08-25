-- Explicit roadmap-visibility whitelist for feedback statuses (Sync-ON mode).
-- Only statuses with show_on_roadmap = true become roadmap columns, so intake
-- and internal statuses (Open, Under Review, Closed, and anything custom) never
-- leak onto the roadmap. Defaults to false; the standard roadmap statuses are
-- backfilled to true so existing workspaces keep Planned/In Progress/Completed.

ALTER TABLE "workspace_statuses"
  ADD COLUMN IF NOT EXISTS "show_on_roadmap" boolean DEFAULT false NOT NULL;

-- Backfill: preserve the previous roadmap behaviour for existing workspaces.
UPDATE "workspace_statuses"
  SET "show_on_roadmap" = true
  WHERE "slug" IN ('planned', 'in_progress', 'completed');
