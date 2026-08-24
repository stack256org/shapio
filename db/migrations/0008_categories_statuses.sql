-- Feature 8: Categories & Configurable Status Management
--> statement-breakpoint

-- 1. Create workspace_statuses table
CREATE TABLE "workspace_statuses" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "color" text NOT NULL DEFAULT '#6b7280',
  "display_order" integer NOT NULL DEFAULT 0,
  "is_default" boolean NOT NULL DEFAULT false,
  "is_archived" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX "workspace_statuses_workspace_slug_unq" ON "workspace_statuses"("workspace_id", "slug");
--> statement-breakpoint
CREATE INDEX "workspace_statuses_workspace_id_idx" ON "workspace_statuses"("workspace_id");
--> statement-breakpoint
CREATE INDEX "workspace_statuses_workspace_order_idx" ON "workspace_statuses"("workspace_id", "display_order");
--> statement-breakpoint

-- 2. Create categories table
CREATE TABLE "categories" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "color" text NOT NULL DEFAULT '#6366f1',
  "display_order" integer NOT NULL DEFAULT 0,
  "is_archived" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX "categories_workspace_slug_unq" ON "categories"("workspace_id", "slug");
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_workspace_name_unq" ON "categories"("workspace_id", "name");
--> statement-breakpoint
CREATE INDEX "categories_workspace_id_idx" ON "categories"("workspace_id");
--> statement-breakpoint
CREATE INDEX "categories_workspace_order_idx" ON "categories"("workspace_id", "display_order");
--> statement-breakpoint

-- 3. Convert posts.status from pgEnum to text (preserves all existing values)
ALTER TABLE "posts" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "status" TYPE text USING "status"::text;
--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "status" SET DEFAULT 'open';
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."post_status";
--> statement-breakpoint

-- 4. Add category_id to posts
ALTER TABLE "posts" ADD COLUMN "category_id" text REFERENCES "categories"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "posts_category_id_idx" ON "posts"("category_id");
--> statement-breakpoint

-- 5. Seed default statuses for all existing workspaces
INSERT INTO "workspace_statuses" ("id", "workspace_id", "name", "slug", "color", "display_order", "is_default", "is_archived")
SELECT
  concat('ws_', w.id, '_open'),
  w.id, 'Open', 'open', '#6b7280', 0, true, false
FROM "workspaces" w;
--> statement-breakpoint

INSERT INTO "workspace_statuses" ("id", "workspace_id", "name", "slug", "color", "display_order", "is_default", "is_archived")
SELECT
  concat('ws_', w.id, '_under_review'),
  w.id, 'Under Review', 'under_review', '#8b5cf6', 1, false, false
FROM "workspaces" w;
--> statement-breakpoint

INSERT INTO "workspace_statuses" ("id", "workspace_id", "name", "slug", "color", "display_order", "is_default", "is_archived")
SELECT
  concat('ws_', w.id, '_planned'),
  w.id, 'Planned', 'planned', '#7c3aed', 2, false, false
FROM "workspaces" w;
--> statement-breakpoint

INSERT INTO "workspace_statuses" ("id", "workspace_id", "name", "slug", "color", "display_order", "is_default", "is_archived")
SELECT
  concat('ws_', w.id, '_in_progress'),
  w.id, 'In Progress', 'in_progress', '#d97706', 3, false, false
FROM "workspaces" w;
--> statement-breakpoint

INSERT INTO "workspace_statuses" ("id", "workspace_id", "name", "slug", "color", "display_order", "is_default", "is_archived")
SELECT
  concat('ws_', w.id, '_completed'),
  w.id, 'Completed', 'completed', '#059669', 4, false, false
FROM "workspaces" w;
--> statement-breakpoint

INSERT INTO "workspace_statuses" ("id", "workspace_id", "name", "slug", "color", "display_order", "is_default", "is_archived")
SELECT
  concat('ws_', w.id, '_closed'),
  w.id, 'Closed', 'closed', '#374151', 5, false, false
FROM "workspaces" w;
