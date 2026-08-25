-- Roadmap manual mode. Adds a workspace toggle "Sync Roadmap from Feedback"
-- (roadmap_sync_enabled, default true = existing derived behaviour) and two
-- tables that power the OFF (manual) mode: workspace-defined roadmap columns
-- (roadmap_statuses) and manually managed cards (roadmap_items). When the
-- toggle is ON these tables are unused and the roadmap stays derived from
-- feedback statuses, so existing workspaces are unaffected.

-- Workspace toggle (default true keeps every existing workspace on the current
-- feedback-derived roadmap).
ALTER TABLE "workspaces"
  ADD COLUMN IF NOT EXISTS "roadmap_sync_enabled" boolean DEFAULT true NOT NULL;

-- Manual roadmap columns (workspace-scoped).
CREATE TABLE IF NOT EXISTS "roadmap_statuses" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "name" text NOT NULL,
  "color" text DEFAULT '#6b7280' NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "roadmap_statuses"
    ADD CONSTRAINT "roadmap_statuses_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "roadmap_statuses_workspace_id_idx"
  ON "roadmap_statuses" USING btree ("workspace_id");
CREATE INDEX IF NOT EXISTS "roadmap_statuses_workspace_order_idx"
  ON "roadmap_statuses" USING btree ("workspace_id","display_order");

-- Manually managed roadmap cards (workspace-scoped, one column each).
CREATE TABLE IF NOT EXISTS "roadmap_items" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "status_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "launch_date" timestamp with time zone,
  "cover_image" text,
  "feedback_id" text,
  "sync_mode" text DEFAULT 'manual' NOT NULL,
  "vote_count" integer DEFAULT 0 NOT NULL,
  "comment_count" integer DEFAULT 0 NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "roadmap_items"
    ADD CONSTRAINT "roadmap_items_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "roadmap_items"
    ADD CONSTRAINT "roadmap_items_status_id_roadmap_statuses_id_fk"
    FOREIGN KEY ("status_id") REFERENCES "roadmap_statuses"("id") ON DELETE restrict;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "roadmap_items"
    ADD CONSTRAINT "roadmap_items_feedback_id_posts_id_fk"
    FOREIGN KEY ("feedback_id") REFERENCES "posts"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "roadmap_items_workspace_id_idx"
  ON "roadmap_items" USING btree ("workspace_id");
CREATE INDEX IF NOT EXISTS "roadmap_items_status_order_idx"
  ON "roadmap_items" USING btree ("status_id","display_order");
CREATE INDEX IF NOT EXISTS "roadmap_items_feedback_id_idx"
  ON "roadmap_items" USING btree ("feedback_id");
