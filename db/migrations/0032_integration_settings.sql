-- Single-row table (id always 1) holding optional integration config moved
-- out of .env — SMTP, Google OAuth, S3/R2 storage, the inbound email webhook
-- secret. See db/schema/integration-settings.ts and lib/integration-settings.ts.
CREATE TABLE "integration_settings" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "smtp_host" text,
  "smtp_port" integer,
  "smtp_user" text,
  "smtp_pass_encrypted" text,
  "email_from" text,
  "google_client_id" text,
  "google_client_secret_encrypted" text,
  "email_webhook_secret_encrypted" text,
  "storage_s3_region" text,
  "storage_s3_bucket" text,
  "storage_s3_access_key_id" text,
  "storage_s3_secret_access_key_encrypted" text,
  "storage_s3_endpoint" text,
  "storage_public_url_base" text,
  "storage_local_dir" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
