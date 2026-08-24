-- Feature 13: Orbit Admin
-- Creates feature_flags and platform_settings tables

--> statement-breakpoint
-- 1. feature_flags
CREATE TABLE IF NOT EXISTS "feature_flags" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "is_enabled" boolean NOT NULL DEFAULT true,
  "description" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "feature_flags_key_unq" ON "feature_flags" ("key");
--> statement-breakpoint

-- 2. platform_settings (singleton, id always = 1)
CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "signup_enabled" boolean NOT NULL DEFAULT true,
  "max_workspaces_per_user" integer NOT NULL DEFAULT 5,
  "maintenance_mode" boolean NOT NULL DEFAULT false,
  "maintenance_message" text,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
