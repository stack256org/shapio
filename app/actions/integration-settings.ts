"use server";

import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import { integrationSettings } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/authz";
import { decrypt, encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getIntegrationSettingsRow } from "@/lib/integration-settings";
import {
  type IntegrationSettingsStatus,
  UNCHANGED_SECRET,
} from "@/lib/integration-settings-types";
import { adminBaseUrl } from "@/lib/urls";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

type SecretAction =
  | { kind: "keep" }
  | { kind: "clear" }
  | { kind: "set"; plaintext: string };

function resolveSecretInput(input: string): SecretAction {
  if (input === UNCHANGED_SECRET) {
    return { kind: "keep" };
  }
  if (input.trim() === "") {
    return { kind: "clear" };
  }
  return { kind: "set", plaintext: input };
}

/** Encrypted column value to write, or `undefined` to leave the column untouched. */
function secretColumnPatch(action: SecretAction): string | null | undefined {
  if (action.kind === "keep") {
    return;
  }
  if (action.kind === "clear") {
    return null;
  }
  return encrypt(action.plaintext);
}

async function revalidateIntegrationsPages() {
  revalidatePath("/orbit/integrations");
  revalidatePath("/setup");
}

// Local storage only ever writes to disk on this server, so a pasted URL
// (easy to mix up with "Public URL base") can be safely reduced to its path
// instead of rejected — e.g. "http://localhost:3000/public/uploads" becomes
// "public/uploads". Also used to self-heal rows saved before this existed.
function normalizeLocalDir(value: string): string {
  const trimmed = value.trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }
  try {
    return new URL(trimmed).pathname.replace(/^\/+/, "");
  } catch {
    return trimmed;
  }
}

// ─────────────────────────────────────────────────────────────
// Status — safe to send to the client. See IntegrationSettingsStatus
// (lib/integration-settings-types.ts) for field-by-field notes.
// ─────────────────────────────────────────────────────────────

export async function getIntegrationSettingsStatusAction(): Promise<IntegrationSettingsStatus> {
  await requireAdmin();
  const row = await getIntegrationSettingsRow();

  return {
    smtp: {
      host: row?.smtpHost ?? env.SMTP_HOST ?? "",
      port: row?.smtpPort ?? env.SMTP_PORT ?? null,
      user: row?.smtpUser ?? env.SMTP_USER ?? "",
      from: row?.emailFrom ?? env.EMAIL_FROM ?? "",
      hasPass: !!(row?.smtpPassEncrypted || env.SMTP_PASS),
      passFromEnv: !row?.smtpPassEncrypted && !!env.SMTP_PASS,
    },
    google: {
      clientId: row?.googleClientId ?? env.GOOGLE_CLIENT_ID ?? "",
      hasClientSecret: !!(
        row?.googleClientSecretEncrypted || env.GOOGLE_CLIENT_SECRET
      ),
      clientSecretFromEnv:
        !row?.googleClientSecretEncrypted && !!env.GOOGLE_CLIENT_SECRET,
    },
    webhook: {
      hasSecret: !!(
        row?.emailWebhookSecretEncrypted || env.EMAIL_WEBHOOK_SECRET
      ),
      secretFromEnv:
        !row?.emailWebhookSecretEncrypted && !!env.EMAIL_WEBHOOK_SECRET,
    },
    storage: {
      region: row?.storageS3Region ?? env.STORAGE_S3_REGION ?? "",
      bucket: row?.storageS3Bucket ?? env.STORAGE_S3_BUCKET ?? "",
      accessKeyId:
        row?.storageS3AccessKeyId ?? env.STORAGE_S3_ACCESS_KEY_ID ?? "",
      endpoint: row?.storageS3Endpoint ?? env.STORAGE_S3_ENDPOINT ?? "",
      publicUrlBase:
        row?.storagePublicUrlBase ?? env.STORAGE_PUBLIC_URL_BASE ?? "",
      localDir: normalizeLocalDir(
        row?.storageLocalDir ?? env.STORAGE_LOCAL_DIR ?? ""
      ),
      hasSecretAccessKey: !!(
        row?.storageS3SecretAccessKeyEncrypted ||
        env.STORAGE_S3_SECRET_ACCESS_KEY
      ),
      secretAccessKeyFromEnv:
        !row?.storageS3SecretAccessKeyEncrypted &&
        !!env.STORAGE_S3_SECRET_ACCESS_KEY,
    },
  };
}

async function upsertIntegrationSettings(
  patch: Partial<typeof integrationSettings.$inferInsert>
) {
  await db
    .insert(integrationSettings)
    .values({ id: 1, ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: integrationSettings.id,
      set: { ...patch, updatedAt: new Date() },
    });
}

// ─────────────────────────────────────────────────────────────
// SMTP
// ─────────────────────────────────────────────────────────────

export async function updateSmtpSettingsAction(input: {
  host: string;
  port: number | null;
  user: string;
  from: string;
  pass: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  const passAction = resolveSecretInput(input.pass);

  let pass: string | undefined;
  if (passAction.kind === "set") {
    pass = passAction.plaintext;
  } else if (passAction.kind === "keep") {
    const row = await getIntegrationSettingsRow();
    pass = row?.smtpPassEncrypted
      ? safeDecryptOrUndefined(row.smtpPassEncrypted)
      : env.SMTP_PASS;
  }

  const host = input.host.trim();
  const user = input.user.trim();
  if (host && user && pass) {
    const check = await verifySmtpConnection({
      host,
      port: input.port,
      user,
      pass,
    });
    if (!check.ok) {
      return {
        success: false,
        error: `Couldn't connect with these SMTP credentials: ${check.message}`,
      };
    }
  }

  try {
    await upsertIntegrationSettings({
      smtpHost: input.host.trim() || null,
      smtpPort: input.port,
      smtpUser: input.user.trim() || null,
      emailFrom: input.from.trim() || null,
      smtpPassEncrypted: secretColumnPatch(passAction),
    });

    await audit({
      action: "integration_settings.smtp_updated",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: "SMTP integration settings updated",
      entityId: "smtp",
      entityType: "platform",
      workspaceId: null,
    });

    await revalidateIntegrationsPages();
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[integration-settings] failed to update SMTP", error);
    return { success: false, error: "Failed to save SMTP settings." };
  }
}

export async function testSmtpConnectionAction(input: {
  host: string;
  port: number | null;
  user: string;
  from: string;
  pass: string;
}): Promise<ActionResult> {
  await requireAdmin();

  const passAction = resolveSecretInput(input.pass);
  let pass: string | undefined;
  if (passAction.kind === "set") {
    pass = passAction.plaintext;
  } else if (passAction.kind === "keep") {
    const row = await getIntegrationSettingsRow();
    pass = row?.smtpPassEncrypted
      ? safeDecryptOrUndefined(row.smtpPassEncrypted)
      : env.SMTP_PASS;
  }

  if (!(input.host && input.user && pass)) {
    return { success: false, error: "Host, user, and password are required." };
  }

  const check = await verifySmtpConnection({
    host: input.host,
    port: input.port,
    user: input.user,
    pass,
  });
  if (!check.ok) {
    return { success: false, error: check.message };
  }
  return { success: true, data: undefined };
}

async function verifySmtpConnection(input: {
  host: string;
  port: number | null;
  user: string;
  pass: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: input.host,
      port: input.port ?? 587,
      auth: { user: input.user, pass: input.pass },
    });
    await transporter.verify();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Connection failed.";
    return { ok: false, message };
  }
}

function safeDecryptOrUndefined(ciphertext: string): string | undefined {
  try {
    return decrypt(ciphertext);
  } catch {
    return;
  }
}

// ─────────────────────────────────────────────────────────────
// Google OAuth
// ─────────────────────────────────────────────────────────────

export async function updateGoogleOAuthSettingsAction(input: {
  clientId: string;
  clientSecret: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  const secretAction = resolveSecretInput(input.clientSecret);

  let clientSecret: string | undefined;
  if (secretAction.kind === "set") {
    clientSecret = secretAction.plaintext;
  } else if (secretAction.kind === "keep") {
    const row = await getIntegrationSettingsRow();
    clientSecret = row?.googleClientSecretEncrypted
      ? safeDecryptOrUndefined(row.googleClientSecretEncrypted)
      : env.GOOGLE_CLIENT_SECRET;
  }

  const clientId = input.clientId.trim();
  if (clientId && clientSecret) {
    const check = await checkGoogleOAuthCredentials(clientId, clientSecret);
    if (check.status === "invalid") {
      return { success: false, error: check.message };
    }
    // "unknown" (e.g. no outbound network access to Google from this
    // server) doesn't block the save — we can't prove the credentials are
    // bad, and self-hosted deployments may not have internet egress here.
  }

  try {
    await upsertIntegrationSettings({
      googleClientId: input.clientId.trim() || null,
      googleClientSecretEncrypted: secretColumnPatch(secretAction),
    });

    await audit({
      action: "integration_settings.google_oauth_updated",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: "Google OAuth integration settings updated",
      entityId: "google_oauth",
      entityType: "platform",
      workspaceId: null,
    });

    await revalidateIntegrationsPages();
    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error(
      "[integration-settings] failed to update Google OAuth",
      error
    );
    return { success: false, error: "Failed to save Google OAuth settings." };
  }
}

export async function testGoogleOAuthConnectionAction(input: {
  clientId: string;
  clientSecret: string;
}): Promise<ActionResult> {
  await requireAdmin();

  const secretAction = resolveSecretInput(input.clientSecret);
  let clientSecret: string | undefined;
  if (secretAction.kind === "set") {
    clientSecret = secretAction.plaintext;
  } else if (secretAction.kind === "keep") {
    const row = await getIntegrationSettingsRow();
    clientSecret = row?.googleClientSecretEncrypted
      ? safeDecryptOrUndefined(row.googleClientSecretEncrypted)
      : env.GOOGLE_CLIENT_SECRET;
  }

  const clientId = input.clientId.trim();
  if (!(clientId && clientSecret)) {
    return {
      success: false,
      error: "Client ID and client secret are required.",
    };
  }

  const check = await checkGoogleOAuthCredentials(clientId, clientSecret);
  if (check.status === "invalid" || check.status === "unknown") {
    return { success: false, error: check.message };
  }
  return { success: true, data: undefined };
}

// Google has no "verify these credentials" endpoint short of completing a
// full OAuth flow. Instead we probe the token endpoint with a deliberately
// bogus authorization code: Google authenticates client_id/client_secret
// *before* it looks at the code, so a bad pair is rejected immediately with
// "invalid_client" — anything else (e.g. "invalid_grant" for our fake code)
// means the pair authenticated successfully.
async function checkGoogleOAuthCredentials(
  clientId: string,
  clientSecret: string
): Promise<
  | { status: "valid" }
  | { status: "invalid"; message: string }
  | { status: "unknown"; message: string }
> {
  let response: Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: "shapio-credential-probe",
        redirect_uri: `${adminBaseUrl()}/api/auth/callback/google`,
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Request to Google failed.";
    return {
      status: "unknown",
      message: `Couldn't reach Google to verify credentials: ${message}`,
    };
  }

  const body: { error?: string } | null = await response
    .json()
    .catch(() => null);

  if (body?.error === "invalid_client") {
    return {
      status: "invalid",
      message: "Google rejected this Client ID / Client secret pair.",
    };
  }
  if (!body?.error) {
    return {
      status: "unknown",
      message:
        "Google returned an unexpected response while verifying credentials.",
    };
  }
  return { status: "valid" };
}

// ─────────────────────────────────────────────────────────────
// Email webhook
// ─────────────────────────────────────────────────────────────

const MIN_WEBHOOK_SECRET_LENGTH = 16;

export async function updateEmailWebhookSecretAction(input: {
  secret: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  const secretAction = resolveSecretInput(input.secret);

  // This secret has no external party to test it against — it's compared
  // (via timingSafeEqual, see app/api/webhooks/email/route.ts) against
  // whatever the provider sends back, so the only thing we can validate
  // up front is that it isn't a trivially weak/guessable value.
  if (
    secretAction.kind === "set" &&
    secretAction.plaintext.length < MIN_WEBHOOK_SECRET_LENGTH
  ) {
    return {
      success: false,
      error: `Webhook secret must be at least ${MIN_WEBHOOK_SECRET_LENGTH} characters — use a long, random value.`,
    };
  }

  try {
    await upsertIntegrationSettings({
      emailWebhookSecretEncrypted: secretColumnPatch(secretAction),
    });

    await audit({
      action: "integration_settings.email_webhook_updated",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: "Email webhook secret updated",
      entityId: "email_webhook",
      entityType: "platform",
      workspaceId: null,
    });

    await revalidateIntegrationsPages();
    return { success: true, data: undefined };
  } catch (error) {
    console.error(
      "[integration-settings] failed to update webhook secret",
      error
    );
    return { success: false, error: "Failed to save the webhook secret." };
  }
}

// ─────────────────────────────────────────────────────────────
// Storage (S3/R2)
// ─────────────────────────────────────────────────────────────

export async function updateStorageSettingsAction(input: {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  publicUrlBase: string;
  localDir: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  const secretAction = resolveSecretInput(input.secretAccessKey);
  const localDir = normalizeLocalDir(input.localDir);

  let secretAccessKey: string | undefined;
  if (secretAction.kind === "set") {
    secretAccessKey = secretAction.plaintext;
  } else if (secretAction.kind === "keep") {
    const row = await getIntegrationSettingsRow();
    secretAccessKey = row?.storageS3SecretAccessKeyEncrypted
      ? safeDecryptOrUndefined(row.storageS3SecretAccessKeyEncrypted)
      : env.STORAGE_S3_SECRET_ACCESS_KEY;
  }

  const region = input.region.trim();
  const bucket = input.bucket.trim();
  const accessKeyId = input.accessKeyId.trim();
  const endpoint = input.endpoint.trim();
  if (bucket && accessKeyId && secretAccessKey && (region || endpoint)) {
    const check = await verifyStorageConnection({
      region: region || "auto",
      bucket,
      accessKeyId,
      secretAccessKey,
      endpoint,
    });
    if (!check.ok) {
      return {
        success: false,
        error: `Couldn't reach this bucket with these credentials: ${check.message}`,
      };
    }
  }

  try {
    await upsertIntegrationSettings({
      storageS3Region: input.region.trim() || null,
      storageS3Bucket: input.bucket.trim() || null,
      storageS3AccessKeyId: input.accessKeyId.trim() || null,
      storageS3Endpoint: input.endpoint.trim() || null,
      storagePublicUrlBase: input.publicUrlBase.trim() || null,
      storageLocalDir: localDir || null,
      storageS3SecretAccessKeyEncrypted: secretColumnPatch(secretAction),
    });

    await audit({
      action: "integration_settings.storage_updated",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: "Storage integration settings updated",
      entityId: "storage",
      entityType: "platform",
      workspaceId: null,
    });

    await revalidateIntegrationsPages();
    return { success: true, data: undefined };
  } catch (error) {
    console.error(
      "[integration-settings] failed to update storage settings",
      error
    );
    return { success: false, error: "Failed to save storage settings." };
  }
}

export async function testStorageConnectionAction(input: {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
}): Promise<ActionResult> {
  await requireAdmin();

  const secretAction = resolveSecretInput(input.secretAccessKey);
  let secretAccessKey: string | undefined;
  if (secretAction.kind === "set") {
    secretAccessKey = secretAction.plaintext;
  } else if (secretAction.kind === "keep") {
    const row = await getIntegrationSettingsRow();
    secretAccessKey = row?.storageS3SecretAccessKeyEncrypted
      ? safeDecryptOrUndefined(row.storageS3SecretAccessKeyEncrypted)
      : env.STORAGE_S3_SECRET_ACCESS_KEY;
  }

  if (
    !(
      input.bucket &&
      input.accessKeyId &&
      secretAccessKey &&
      (input.region || input.endpoint)
    )
  ) {
    return {
      success: false,
      error:
        "Bucket, access key ID, secret key, and a region or endpoint are required.",
    };
  }

  const check = await verifyStorageConnection({
    region: input.region || "auto",
    bucket: input.bucket,
    accessKeyId: input.accessKeyId,
    secretAccessKey,
    endpoint: input.endpoint,
  });
  if (!check.ok) {
    return { success: false, error: check.message };
  }
  return { success: true, data: undefined };
}

async function verifyStorageConnection(input: {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const client = new S3Client({
      region: input.region,
      endpoint: input.endpoint || undefined,
      forcePathStyle: Boolean(input.endpoint),
      credentials: {
        accessKeyId: input.accessKeyId,
        secretAccessKey: input.secretAccessKey,
      },
    });
    await client.send(new HeadBucketCommand({ Bucket: input.bucket }));
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Connection failed.";
    return { ok: false, message };
  }
}
