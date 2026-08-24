-- Migration 0009: Changelog tables

CREATE TABLE "changelog_entries" (
  "id"           text        PRIMARY KEY,
  "workspace_id" text        NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "title"        text        NOT NULL,
  "body"         text        NOT NULL DEFAULT '',
  "label"        text        NOT NULL DEFAULT 'new_feature',
  "is_published" boolean     NOT NULL DEFAULT false,
  "published_at" timestamptz,
  "notified_at"  timestamptz,
  "created_by"   text        NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  "updated_at"   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "changelog_posts" (
  "changelog_entry_id" text NOT NULL REFERENCES "changelog_entries"("id") ON DELETE CASCADE,
  "post_id"            text NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  PRIMARY KEY ("changelog_entry_id", "post_id")
);

CREATE INDEX "changelog_entries_workspace_id_idx"       ON "changelog_entries" ("workspace_id");
CREATE INDEX "changelog_entries_workspace_published_idx" ON "changelog_entries" ("workspace_id", "is_published", "published_at");
CREATE INDEX "changelog_entries_created_by_idx"         ON "changelog_entries" ("created_by");
CREATE INDEX "changelog_posts_post_id_idx"              ON "changelog_posts" ("post_id");
