-- Public-feed visibility for feedback statuses, independent of show_on_roadmap:
-- whether posts with a given status appear in the public feedback list/board
-- and are reachable at their public URL. Defaults to true for every status.
-- Completed is backfilled to false so shipped feedback no longer clutters the
-- public feed for existing workspaces — it still shows on the public Roadmap
-- (a separate flag) and remains fully visible in the admin panel.

ALTER TABLE "workspace_statuses"
  ADD COLUMN IF NOT EXISTS "show_on_public_feed" boolean DEFAULT true NOT NULL;

-- Backfill: hide Completed from the public feed for existing workspaces.
UPDATE "workspace_statuses"
  SET "show_on_public_feed" = false
  WHERE "slug" = 'completed';
