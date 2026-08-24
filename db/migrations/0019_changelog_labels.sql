-- Persistent, user-managed changelog labels (workspace-scoped). The five
-- built-in labels stay as constants; this table holds only custom labels so
-- they survive a refresh and can be renamed/deleted.

CREATE TABLE IF NOT EXISTS "changelog_labels" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "name" text NOT NULL,
  "color" text DEFAULT '#6b7280' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "changelog_labels"
    ADD CONSTRAINT "changelog_labels_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "changelog_labels_workspace_name_unq"
  ON "changelog_labels" USING btree ("workspace_id","name");
CREATE INDEX IF NOT EXISTS "changelog_labels_workspace_id_idx"
  ON "changelog_labels" USING btree ("workspace_id");

-- Backfill: promote any custom labels already used on entries (i.e. not one of
-- the five built-in keys) into managed rows so they keep working.
INSERT INTO "changelog_labels" ("id", "workspace_id", "name")
SELECT md5(random()::text || clock_timestamp()::text), "workspace_id", "label"
FROM (
  SELECT DISTINCT "workspace_id", "label"
  FROM "changelog_entries"
  WHERE "label" IS NOT NULL
    AND "label" <> ''
    AND "label" NOT IN ('new_feature','improvement','bug_fix','security','deprecation')
) AS distinct_labels
ON CONFLICT ("workspace_id","name") DO NOTHING;
