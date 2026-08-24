-- Feature 12: Workspace Settings & Moderation
-- Extends audit_logs, workspaces, posts; creates blocked_users, outbound webhooks, api_keys

--> statement-breakpoint
-- 1. Extend audit_logs
ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "workspace_id" text,
  ADD COLUMN IF NOT EXISTS "actor_name" text,
  ADD COLUMN IF NOT EXISTS "entity_name" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_workspace_created_at_idx"
  ON "audit_logs" ("workspace_id", "created_at");
--> statement-breakpoint

-- 2. Add spam_keywords to workspaces
ALTER TABLE "workspaces"
  ADD COLUMN IF NOT EXISTS "spam_keywords" text[] NOT NULL DEFAULT '{}';
--> statement-breakpoint

-- 3. Add is_approved to posts (existing posts default to approved)
ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "is_approved" boolean NOT NULL DEFAULT true;
--> statement-breakpoint

-- 4. blocked_users
CREATE TABLE IF NOT EXISTS "blocked_users" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "user_id" text,
  "user_email" text,
  "user_name" text,
  "blocked_by" text NOT NULL,
  "reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "blocked_users"
  ADD CONSTRAINT "blocked_users_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "blocked_users"
  ADD CONSTRAINT "blocked_users_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "blocked_users"
  ADD CONSTRAINT "blocked_users_blocked_by_user_id_fk"
  FOREIGN KEY ("blocked_by") REFERENCES "public"."user"("id") ON DELETE CASCADE;
--> statement-breakpoint
-- Partial unique indexes for blocked_users
CREATE UNIQUE INDEX IF NOT EXISTS "blocked_users_workspace_user_unq"
  ON "blocked_users" ("workspace_id", "user_id")
  WHERE "user_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "blocked_users_workspace_email_unq"
  ON "blocked_users" ("workspace_id", "user_email")
  WHERE "user_email" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blocked_users_workspace_id_idx" ON "blocked_users" ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blocked_users_user_id_idx" ON "blocked_users" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blocked_users_user_email_idx" ON "blocked_users" ("user_email");
--> statement-breakpoint

-- 5. outbound_webhook_endpoints
CREATE TABLE IF NOT EXISTS "outbound_webhook_endpoints" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "url" text NOT NULL,
  "encrypted_secret" text NOT NULL,
  "events" text[] NOT NULL DEFAULT '{}',
  "is_enabled" boolean NOT NULL DEFAULT true,
  "consecutive_failures" integer NOT NULL DEFAULT 0,
  "disabled_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "outbound_webhook_endpoints"
  ADD CONSTRAINT "webhook_endpoints_workspace_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_endpoints_workspace_id_idx"
  ON "outbound_webhook_endpoints" ("workspace_id");
--> statement-breakpoint

-- 6. outbound_webhook_deliveries
CREATE TABLE IF NOT EXISTS "outbound_webhook_deliveries" (
  "id" text PRIMARY KEY NOT NULL,
  "endpoint_id" text NOT NULL,
  "event" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "attempts" integer NOT NULL DEFAULT 0,
  "response_status" integer,
  "last_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "outbound_webhook_deliveries"
  ADD CONSTRAINT "webhook_deliveries_endpoint_id_fk"
  FOREIGN KEY ("endpoint_id") REFERENCES "public"."outbound_webhook_endpoints"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_deliveries_endpoint_created_at_idx"
  ON "outbound_webhook_deliveries" ("endpoint_id", "created_at");
--> statement-breakpoint

-- 7. api_keys
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "user_id" text,
  "name" text NOT NULL,
  "token_hash" text NOT NULL,
  "last_used_at" timestamptz,
  "is_enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "api_keys"
  ADD CONSTRAINT "api_keys_workspace_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "api_keys"
  ADD CONSTRAINT "api_keys_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_token_hash_unq" ON "api_keys" ("token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_keys_workspace_id_idx" ON "api_keys" ("workspace_id");
