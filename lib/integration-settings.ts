import path from "node:path";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { integrationSettings } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Reads for the `integration_settings` singleton row plus one typed getter
 * per integration. Every getter follows the same rule: `dbValue ?? envValue`
 * per field — an Admin → Integrations / setup-wizard value in the database
 * always wins, and .env keeps working as a fallback for existing installs
 * that never touch the database. A getter returns null when the integration
 * isn't fully configured either way.
 *
 * `getRow` is wrapped in React `cache()` so a request that calls several of
 * these getters (e.g. rendering the Integrations admin page) only reads the
 * row once. It is NOT a module-level singleton — the value is re-read fresh
 * on every request/render, so changes made via the admin UI apply live with
 * no restart. The one documented exception is Google OAuth: see
 * lib/auth.ts, which reads this at process-boot module-evaluation time
 * because better-auth builds its client once.
 */

export type IntegrationSettingsRow = typeof integrationSettings.$inferSelect;

export const getIntegrationSettingsRow = cache(
  async (): Promise<IntegrationSettingsRow | null> => {
    const [row] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.id, 1))
      .limit(1);
    return row ?? null;
  }
);

function safeDecrypt(
  ciphertext: string | null | undefined
): string | undefined {
  if (!ciphertext) {
    return;
  }
  try {
    return decrypt(ciphertext);
  } catch (error) {
    // Most likely APP_SECRET changed since the value was encrypted. Treat as
    // unset (falls back to env) rather than taking the whole app down.
    console.error(
      "[integration-settings] failed to decrypt a stored secret — falling back to env",
      error
    );
    return;
  }
}

export interface SmtpSettings {
  from: string;
  host: string;
  pass: string;
  port: number;
  user: string;
}

export async function getSmtpSettings(): Promise<SmtpSettings | null> {
  const row = await getIntegrationSettingsRow();
  const host = row?.smtpHost ?? env.SMTP_HOST;
  const port = row?.smtpPort ?? env.SMTP_PORT ?? 587;
  const user = row?.smtpUser ?? env.SMTP_USER;
  const pass = safeDecrypt(row?.smtpPassEncrypted) ?? env.SMTP_PASS;
  const from = row?.emailFrom ?? env.EMAIL_FROM;

  if (!(host && user && pass && from)) {
    return null;
  }
  return { host, port, user, pass, from };
}

export async function isSmtpConfigured(): Promise<boolean> {
  return (await getSmtpSettings()) !== null;
}

export interface GoogleOAuthSettings {
  clientId: string;
  clientSecret: string;
}

export async function getGoogleOAuthSettings(): Promise<GoogleOAuthSettings | null> {
  const row = await getIntegrationSettingsRow();
  const clientId = row?.googleClientId ?? env.GOOGLE_CLIENT_ID;
  const clientSecret =
    safeDecrypt(row?.googleClientSecretEncrypted) ?? env.GOOGLE_CLIENT_SECRET;

  if (!(clientId && clientSecret)) {
    return null;
  }
  return { clientId, clientSecret };
}

export async function getEmailWebhookSecret(): Promise<string | null> {
  const row = await getIntegrationSettingsRow();
  return (
    safeDecrypt(row?.emailWebhookSecretEncrypted) ??
    env.EMAIL_WEBHOOK_SECRET ??
    null
  );
}

export interface StorageS3Settings {
  accessKeyId: string;
  bucket: string;
  endpoint?: string;
  publicUrlBase: string;
  region: string;
  secretAccessKey: string;
}

export async function getStorageS3Settings(): Promise<StorageS3Settings | null> {
  const row = await getIntegrationSettingsRow();
  const region = row?.storageS3Region ?? env.STORAGE_S3_REGION;
  const bucket = row?.storageS3Bucket ?? env.STORAGE_S3_BUCKET;
  const accessKeyId = row?.storageS3AccessKeyId ?? env.STORAGE_S3_ACCESS_KEY_ID;
  const secretAccessKey =
    safeDecrypt(row?.storageS3SecretAccessKeyEncrypted) ??
    env.STORAGE_S3_SECRET_ACCESS_KEY;
  const endpoint =
    row?.storageS3Endpoint ?? env.STORAGE_S3_ENDPOINT ?? undefined;
  const publicUrlBase =
    row?.storagePublicUrlBase ?? env.STORAGE_PUBLIC_URL_BASE;

  if (!(region && bucket && accessKeyId && secretAccessKey && publicUrlBase)) {
    return null;
  }
  return {
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    endpoint,
    publicUrlBase,
  };
}

export async function isStorageS3Configured(): Promise<boolean> {
  return (await getStorageS3Settings()) !== null;
}

export async function getStorageLocalDir(): Promise<string> {
  const row = await getIntegrationSettingsRow();
  return (
    row?.storageLocalDir ??
    env.STORAGE_LOCAL_DIR ??
    path.join(process.cwd(), "public", "uploads")
  );
}
