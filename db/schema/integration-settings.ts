import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Single-row table (id is always 1) holding optional integration config that
 * used to live only in .env — SMTP, Google OAuth, S3/R2 storage, the inbound
 * email webhook secret. See lib/integration-settings.ts for the DB-wins,
 * env-fallback resolution rule and docs/implementation/INTEGRATIONS.md for the full picture.
 *
 * `*Encrypted` columns hold ciphertext produced by lib/crypto.ts (AES-256-GCM
 * keyed off APP_SECRET) — never plaintext secrets. Non-secret fields (host,
 * user, bucket, client id) stay plaintext.
 */
export const integrationSettings = pgTable("integration_settings", {
  id: integer("id").primaryKey().default(1),

  // SMTP
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPassEncrypted: text("smtp_pass_encrypted"),
  emailFrom: text("email_from"),

  // Google OAuth
  googleClientId: text("google_client_id"),
  googleClientSecretEncrypted: text("google_client_secret_encrypted"),

  // Inbound email webhook
  emailWebhookSecretEncrypted: text("email_webhook_secret_encrypted"),

  // S3/R2-compatible object storage
  storageS3Region: text("storage_s3_region"),
  storageS3Bucket: text("storage_s3_bucket"),
  storageS3AccessKeyId: text("storage_s3_access_key_id"),
  storageS3SecretAccessKeyEncrypted: text(
    "storage_s3_secret_access_key_encrypted"
  ),
  storageS3Endpoint: text("storage_s3_endpoint"),
  storagePublicUrlBase: text("storage_public_url_base"),
  storageLocalDir: text("storage_local_dir"),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
