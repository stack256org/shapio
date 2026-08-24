-- Adds the column backing account.password in db/schema/auth.ts: the hashed
-- password for better-auth's "credential" provider (email + password sign-in,
-- introduced with the open-source changes). The schema had the column but no
-- migration ever created it, so every freshly migrated database was missing
-- it and credential sign-in failed. Guarded so it is also safe to run against
-- databases where a `drizzle-kit push` already added it.
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "password" text;
