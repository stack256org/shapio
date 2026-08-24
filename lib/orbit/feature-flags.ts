import { eq } from "drizzle-orm";
import { featureFlags } from "@/db/schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export type FeatureFlag = typeof featureFlags.$inferSelect;

const flagCache = new Map<string, { value: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  return db.select().from(featureFlags).orderBy(featureFlags.key);
}

export async function toggleFlag(
  key: string,
  isEnabled: boolean
): Promise<FeatureFlag> {
  const [updated] = await db
    .update(featureFlags)
    .set({ isEnabled, updatedAt: new Date() })
    .where(eq(featureFlags.key, key))
    .returning();

  if (!updated) {
    throw new Error(`Feature flag '${key}' not found`);
  }

  // Invalidate cache
  flagCache.delete(key);
  return updated;
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const cached = flagCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const [flag] = await db
      .select({ isEnabled: featureFlags.isEnabled })
      .from(featureFlags)
      .where(eq(featureFlags.key, key))
      .limit(1);

    // Fall back to this flag's own declared default when its row hasn't been
    // seeded yet (seeding happens in the worker process — see
    // lib/worker/boss.ts — so a web-only deployment may not have it yet).
    // Falls back further to `true` (opt-out) only for an unknown key.
    const value =
      flag?.isEnabled ??
      DEFAULT_FEATURE_FLAGS.find((f) => f.key === key)?.isEnabled ??
      true;
    flagCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch (error) {
    console.error(`[feature-flags] failed to check flag '${key}':`, error);
    return true; // fail-open
  }
}

export const DEFAULT_FEATURE_FLAGS: Array<{
  key: string;
  description: string;
  isEnabled: boolean;
}> = [
  {
    key: "guest_voting",
    // Master switch for accountless participation on the Public Portal: a
    // visitor verifies an email with a one-time code and can then submit
    // feedback, vote, and comment without an account. Enforced in
    // getPortalActor (lib/portal/guest-identity.ts), so turning it off reverts
    // the portal to accounts-only everywhere at once.
    description: "Allow guests to submit feedback, vote, and comment by email",
    isEnabled: true,
  },
  {
    key: "magic_link_auth",
    description: "Magic link sign-in",
    isEnabled: true,
  },
  { key: "google_auth", description: "Google OAuth sign-in", isEnabled: true },
  {
    key: "password_auth",
    // Self-serve REGISTRATION no longer exists on this instance at all — it is
    // removed in code, not toggled (see lib/users/registration.ts). This flag
    // now controls only whether the password field is offered for signing IN,
    // which invited members use after choosing a password during setup.
    description: "Email + password sign-in",
    isEnabled: true,
  },
  {
    key: "show_landing_page",
    // Self-hosted deployments (the default) send logged-out visitors at `/`
    // straight to /signin; this flag serves the marketing landing page there
    // instead — meant for the hosted Shapio.com instance. Seeded (once,
    // INSERT ON CONFLICT DO NOTHING — see lib/worker/boss.ts) from the legacy
    // NEXT_PUBLIC_SHOW_LANDING_PAGE env var so an existing install that set
    // it keeps the same behavior after upgrading; from then on this flag in
    // Orbit → Feature Flags is the only thing that controls it.
    description: "Serve the marketing landing page at / instead of /signin",
    isEnabled: env.NEXT_PUBLIC_SHOW_LANDING_PAGE,
  },
];
