-- Backs db/schema/portal-verifications.ts: the email-ownership challenge for
-- accountless Public Portal visitors. Distinct from better-auth's own
-- `verification` table — clearing a row here mints no user and no session, it
-- only proves control of the address, which is then carried in a signed cookie.
--
-- Only the SHA-256 of the code is persisted, never the code itself.
CREATE TABLE IF NOT EXISTS "portal_verifications" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "code_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "last_sent_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- One live code per address: a resend rotates the existing row (ON CONFLICT)
-- instead of leaving several codes simultaneously valid.
CREATE UNIQUE INDEX IF NOT EXISTS "portal_verifications_email_unq"
  ON "portal_verifications" ("email");
