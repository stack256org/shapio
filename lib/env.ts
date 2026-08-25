import { existsSync } from "node:fs";
import { z } from "zod";

// Next.js loads .env automatically; for standalone tsx scripts (db/reset, worker, etc.) we load it here.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional()
);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_SECRET: z.string().min(1),
  // The Workspace/Admin app host (e.g. https://app.example.com). Kept as the
  // legacy single-origin URL name for backwards compatibility.
  NEXT_PUBLIC_APP_URL: z.url(),
  // Two-host split (Workspace vs Public Portal). Both are optional and default
  // to NEXT_PUBLIC_APP_URL, so a single-host deployment keeps working unchanged.
  // Set them to distinct hosts (app.<domain> / portal.<domain>) to isolate the
  // two applications' sessions — see docs/migration/01-portal-subdomain-auth.md.
  NEXT_PUBLIC_ADMIN_URL: z.url().optional(),
  NEXT_PUBLIC_PORTAL_URL: z.url().optional(),
  // Legacy — only consulted once, to seed the "show_landing_page" feature
  // flag's initial value the first time the worker runs (lib/worker/boss.ts).
  // After that, Orbit → Feature Flags is the only thing that controls it; see
  // lib/orbit/feature-flags.ts.
  NEXT_PUBLIC_SHOW_LANDING_PAGE: z.preprocess(
    (v) => v === "true",
    z.boolean().default(false)
  ),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  SMTP_HOST: optionalString,
  SMTP_PORT: z.preprocess(
    (v) => (v ? Number(v) : undefined),
    z.number().optional()
  ),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  EMAIL_FROM: optionalString,
  EMAIL_WEBHOOK_SECRET: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  ENCRYPTION_KEY: optionalString,
  ORBIT_SEED_EMAIL: optionalString,
  ENABLE_IMPERSONATION: z.preprocess(
    (v) => v === "true",
    z.boolean().default(false)
  ),
  // File storage: set STORAGE_S3_* to upload to AWS S3 / Cloudflare R2 / any
  // S3-compatible host. Leave them unset and uploads are stored on local
  // disk (under public/uploads) instead — no setup required.
  STORAGE_S3_REGION: optionalString,
  STORAGE_S3_BUCKET: optionalString,
  STORAGE_S3_ACCESS_KEY_ID: optionalString,
  STORAGE_S3_SECRET_ACCESS_KEY: optionalString,
  // Set for R2 / other S3-compatible hosts; leave unset for real AWS S3.
  STORAGE_S3_ENDPOINT: optionalString,
  // Public base URL files are served from, no trailing slash — e.g. an S3
  // virtual-hosted-style URL, an R2 public bucket/custom domain, or a CDN in
  // front of either. Required only when using S3/R2.
  STORAGE_PUBLIC_URL_BASE: optionalString,
  // Local storage directory override (defaults to public/uploads).
  STORAGE_LOCAL_DIR: optionalString,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.issues);
  throw new Error("Invalid environment variables");
}

export const env = {
  ...parsed.data,
  // Default the split hosts to the single app URL so nothing changes until an
  // operator opts in by setting them to distinct hosts.
  NEXT_PUBLIC_ADMIN_URL:
    parsed.data.NEXT_PUBLIC_ADMIN_URL ?? parsed.data.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_PORTAL_URL:
    parsed.data.NEXT_PUBLIC_PORTAL_URL ?? parsed.data.NEXT_PUBLIC_APP_URL,
};
