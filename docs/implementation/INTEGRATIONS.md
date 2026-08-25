# IdeaRoads — Integrations & Configuration

> **This file documents *how* optional configuration works, not *what* the
> product does.** See the parent [`docs/`](../) for the product spec.

`.env` only holds what's needed **before the database is even reachable** —
`DATABASE_URL`, `APP_SECRET` (also the source key for encrypting secrets
below), and `NEXT_PUBLIC_APP_URL` (plus its two-host siblings
`NEXT_PUBLIC_ADMIN_URL` / `NEXT_PUBLIC_PORTAL_URL`, read directly by
`middleware.ts` on the Edge runtime, which cannot reach the database). Those
stay env-only; there is no product reason to move them.

Everything else that used to be env-only — SMTP, Google OAuth, S3/R2 file
storage, the inbound email webhook secret — now lives in a single database
table, editable from **Admin → Integrations** (`app/(orbit)/orbit/integrations`)
or the first-run setup wizard's skippable Integrations step. Both write
through the same server actions in `app/actions/integration-settings.ts`.

## Resolution rule: database wins, `.env` is the fallback

Every getter in `lib/integration-settings.ts` resolves each field as
`dbValue ?? envValue`, independently per field. Concretely:

- A fresh install with only `.env` set works exactly as before — nothing to
  migrate, nothing to configure.
- Saving a value in Integrations overrides the matching `.env` var, without
  touching the ones you didn't save.
- Clearing a value in Integrations (the "Clear" control on a secret field, or
  emptying a plain field) falls back to `.env` again, if set.
- A getter returns `null`/`undefined` when the integration isn't fully
  configured either way — every caller already has a documented "not
  configured" behavior (SMTP: log to console; storage: local disk; Google:
  hide the button; webhook: `503`).

## The table

One row (`id = 1`) in `integration_settings`
(`db/schema/integration-settings.ts`, migration `0032`). One column per
field; `*Encrypted` columns hold ciphertext, everything else is plaintext:

| Group | Plaintext columns | Encrypted column |
|---|---|---|
| SMTP | `smtp_host`, `smtp_port`, `smtp_user`, `email_from` | `smtp_pass_encrypted` |
| Google OAuth | `google_client_id` | `google_client_secret_encrypted` |
| Email webhook | — | `email_webhook_secret_encrypted` |
| Storage (S3/R2) | `storage_s3_region`, `storage_s3_bucket`, `storage_s3_access_key_id`, `storage_s3_endpoint`, `storage_public_url_base`, `storage_local_dir` | `storage_s3_secret_access_key_encrypted` |

Same rule as everywhere else in the product: a genuine secret (password,
client secret, access key) is encrypted; an identifier that isn't secret on
its own (host, username, bucket name, client ID, access key *ID*) is
plaintext.

## Encryption

`lib/crypto.ts` — AES-256-GCM, key = `sha256(APP_SECRET)`. Deliberately keyed
off the app secret you already have to set and back up, rather than a second
key to generate and manage separately. Ciphertext is stored as
`iv:tag:ciphertext` (hex). If `APP_SECRET` is ever rotated, previously
encrypted values fail to decrypt — the getters treat that as "unset" and fall
back to `.env` (logging a warning) rather than crashing.

## The API never returns plaintext secrets

`getIntegrationSettingsStatusAction` (`app/actions/integration-settings.ts`)
is the only thing the client ever calls to read current state. For secret
fields it returns `has<Field>: boolean` (and `<field>FromEnv: boolean`, so
the UI can hint "this is currently coming from `.env`") — never the value
itself, regardless of whether that value lives in the database or `.env`.

Saving a form back requires re-typing a secret only if you want to change it.
A form field left untouched submits the sentinel `UNCHANGED_SECRET`
(`lib/integration-settings-types.ts`), which the update action maps to
"leave the encrypted column as-is." An explicit "Clear" submits `""`, mapped
to `null`. Typing a new value encrypts and stores it. This sentinel/blank/
value three-way is implemented once, in `resolveSecretInput` in
`app/actions/integration-settings.ts`, and reused by every field.

## Live per-request reads vs. the one boot-time exception

Per the product's own instructions for this feature: everything should read
fresh per request/call so a change in Integrations applies immediately,
*except* where a library bakes configuration into a singleton at
module-evaluation time — that case is left alone and documented rather than
forced, and needs a restart instead.

**Fresh per call (no restart needed):**
- `lib/smtp/client.ts` (`sendEmailViaSmtp`, `isSmtpConfigured`) — reads
  `getSmtpSettings()` on every send.
- `lib/storage/s3.ts` / `lib/storage/client.ts` — builds a fresh `S3Client`
  per call from `getStorageS3Settings()` (constructing the client is local,
  no network cost, so there's no reason to cache it and risk staleness).
- `lib/storage/local.ts` — reads `getStorageLocalDir()` per call.
- `app/api/webhooks/email/route.ts` — reads `getEmailWebhookSecret()` per
  request.
- The sign-in page's "Forgot password?" link (`app/(auth)/signin/page.tsx`)
  — reads `isSmtpConfigured()` per render.

**The one exception — Google OAuth (restart required):**
`lib/auth.ts` calls `betterAuth({ ... })` **once**, at module-evaluation
time (`export const { auth, googleOAuthEnabled } = await createAuth()`, a
top-level `await`). Better Auth builds its `socialProviders` client from
whatever `getGoogleOAuthSettings()` returned at that moment, and there is no
supported way to swap it out per-request. **Saving Google OAuth credentials
in Integrations does not take effect until the app process restarts** — a
redeploy, or a dev-server reload. The same boot-time read also decides
`requireEmailVerification` (whether SMTP is configured), for the same
structural reason: it's one field in the same `betterAuth()` config object.

The sign-in page shows the Google button based on `googleOAuthEnabled`
(exported alongside `auth`) rather than re-checking Integrations
independently — so the UI can never disagree with what's actually wired into
the running auth client while a restart is pending.

## `NEXT_PUBLIC_SHOW_LANDING_PAGE`

Not an "integration" in the SMTP/OAuth/storage/webhook sense, so it didn't
move into `integration_settings`. It moved into the existing feature-flag
system instead (`show_landing_page` in `lib/orbit/feature-flags.ts`, toggled
at Orbit → Feature Flags). The env var is only read once, by the worker
(`lib/worker/boss.ts`), to seed that flag's initial value on first boot —
after that it's not consulted again.

## Adding a new field to an existing group

1. Add the column to `db/schema/integration-settings.ts` (`*Encrypted` for
   secrets) and a migration.
2. Add it to the relevant getter in `lib/integration-settings.ts`
   (`dbValue ?? envValue`).
3. Add it to `IntegrationSettingsStatus` (`lib/integration-settings-types.ts`)
   and `getIntegrationSettingsStatusAction`.
4. Add it to the group's update action (secret fields go through
   `resolveSecretInput`/`secretColumnPatch`) and its card component under
   `components/settings/integrations/`.
5. Add it to `.env.example` as the fallback, marked optional.
