-- The embed snippet never actually specified which board to show — widget.js
-- supports data-board, but the Settings > Embed UI had no board picker, so
-- every generated snippet pointed at the bare workspace root. There's no
-- public page at that route (only /{slug}/b/{board-slug}), so every embed
-- generated from the UI 404s today. This adds board_id so the UI can require
-- a real board and always emit data-board, and backfills existing configs to
-- their workspace's first public, non-archived board (earliest by
-- display_order, then created_at) where one exists.

ALTER TABLE "workspace_embed_config"
  ADD COLUMN IF NOT EXISTS "board_id" text REFERENCES "boards"("id") ON DELETE SET NULL;

WITH first_public_board AS (
  SELECT DISTINCT ON (workspace_id) id, workspace_id
  FROM boards
  WHERE is_public = true AND is_archived = false
  ORDER BY workspace_id, display_order ASC, created_at ASC
)
UPDATE workspace_embed_config
SET board_id = first_public_board.id
FROM first_public_board
WHERE workspace_embed_config.workspace_id = first_public_board.workspace_id
  AND workspace_embed_config.board_id IS NULL;
