import { env } from "@/lib/env";

/**
 * Absolute-URL helpers for the two-host architecture (Workspace vs Public
 * Portal). See docs/migration/01-portal-subdomain-auth.md.
 *
 * Server-only (reads `env`). Client components must receive these values as
 * props from a server component — do not import this module in client code.
 *
 * Until an operator sets NEXT_PUBLIC_ADMIN_URL / NEXT_PUBLIC_PORTAL_URL to
 * distinct hosts, both helpers return the same single-origin URL, so callers
 * can adopt them freely without any behavior change.
 */

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "");

/**
 * The Workspace/Admin app origin (e.g. https://app.example.com). Canonical host
 * for: sign-in/account/onboarding/orbit, workspace admin pages, invite links,
 * the /api/v1 admin API and its docs, and email-confirmation links.
 */
export function adminBaseUrl(): string {
  return stripTrailingSlash(env.NEXT_PUBLIC_ADMIN_URL);
}

/**
 * The Public Portal origin (e.g. https://portal.example.com). Canonical host
 * for: board/post/roadmap/changelog/profile pages, embeds/widget, RSS feeds,
 * Open Graph/canonical/share URLs, and the public post/changelog links inside
 * notification emails sent to external recipients.
 */
export function portalBaseUrl(): string {
  return stripTrailingSlash(env.NEXT_PUBLIC_PORTAL_URL);
}

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

/** Host (incl. port) of the admin app, e.g. "app.example.com". */
export function adminHost(): string | null {
  return hostOf(env.NEXT_PUBLIC_ADMIN_URL);
}

/** Host (incl. port) of the public portal, e.g. "portal.example.com". */
export function portalHost(): string | null {
  return hostOf(env.NEXT_PUBLIC_PORTAL_URL);
}

/** True when admin and portal are served on distinct hosts. */
export function hostsSplit(): boolean {
  const a = adminHost();
  const p = portalHost();
  return !!a && !!p && a !== p;
}
