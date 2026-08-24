import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";

// Page-route prefixes that require a signed-in user before the page even runs
// (secondary to each page's own auth check). Kept minimal and admin-only.
const AUTH_GATE_PREFIXES = [
  "/orbit",
  "/account",
  "/onboarding",
  "/post-auth",
  "/complete-profile",
];

// Second path segment of the /{slug}/… routes that belong to the Public Portal.
// Everything else under /{slug}/… (feedback, notifications, settings, and the
// bare dashboard) belongs to the Workspace/Admin app.
const PORTAL_SEGMENTS = new Set(["b", "roadmap", "changelog", "profile"]);

// First path segments that are top-level routes, NOT workspace slugs — so we
// never mistake e.g. /features/roadmap (marketing) for a portal route.
const RESERVED_TOP = new Set([
  "api",
  "signin",
  "signup",
  "setup",
  "forgot-password",
  "reset-password",
  "orbit",
  "onboarding",
  "post-auth",
  "account",
  "complete-profile",
  "invite",
  "dashboard",
  "features",
  "demo",
  "privacy",
  "terms",
  "uploads",
  "embed-auth-complete",
]);

function hostOf(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

const ADMIN_HOST =
  hostOf(process.env.NEXT_PUBLIC_ADMIN_URL) ??
  hostOf(process.env.NEXT_PUBLIC_APP_URL);
const PORTAL_HOST =
  hostOf(process.env.NEXT_PUBLIC_PORTAL_URL) ??
  hostOf(process.env.NEXT_PUBLIC_APP_URL);
// Only apply cross-host routing when the two hosts are actually distinct.
const HOSTS_SPLIT = !!ADMIN_HOST && !!PORTAL_HOST && ADMIN_HOST !== PORTAL_HOST;

/** A /{slug}/(b|roadmap|changelog|profile)… Public Portal page. */
function isPortalPath(pathname: string): boolean {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length < 2) {
    return false;
  }
  if (RESERVED_TOP.has(segs[0])) {
    return false;
  }
  return PORTAL_SEGMENTS.has(segs[1]);
}

/** Reachable on both hosts: auth screens and the auth API live on either. */
function isDualHostPath(pathname: string): boolean {
  return (
    pathname === "/signin" ||
    pathname === "/signup" ||
    pathname === "/setup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/signin/") ||
    pathname.startsWith("/signup/") ||
    // Landing page for the embed widget's popup/magic-link sign-in — opened
    // directly on whichever host the widget's iframe is on (always the
    // portal host in practice), so it must never bounce to the other host.
    pathname === "/embed-auth-complete"
  );
}

function authGate(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const gated = AUTH_GATE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (gated && !request.cookies.get(SESSION_COOKIE)?.value) {
    const signinUrl = new URL("/signin", request.url);
    signinUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signinUrl);
  }
  return NextResponse.next();
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const reqHost = request.headers.get("host");

  // Single-origin deployment (or an unrecognised host, e.g. bare localhost in a
  // split dev setup): behave exactly as before — auth-gate only, no host routing.
  if (!HOSTS_SPLIT || (reqHost !== ADMIN_HOST && reqHost !== PORTAL_HOST)) {
    return authGate(request);
  }

  // Portal host: only Public Portal pages (+ auth screens) may render here.
  // Anything admin-shaped is bounced to the admin host at the same path.
  if (reqHost === PORTAL_HOST) {
    if (isPortalPath(pathname) || isDualHostPath(pathname)) {
      return NextResponse.next();
    }
    const target = new URL(`https://${ADMIN_HOST}${pathname}${search}`);
    target.protocol = request.nextUrl.protocol;
    return NextResponse.redirect(target);
  }

  // Admin host: Public Portal pages (incl. legacy links/bookmarks) are sent to
  // the portal host so the two experiences never mix on the admin origin.
  if (isPortalPath(pathname)) {
    const target = new URL(`https://${PORTAL_HOST}${pathname}${search}`);
    target.protocol = request.nextUrl.protocol;
    return NextResponse.redirect(target);
  }

  return authGate(request);
}

export const config = {
  // Run on all page routes; skip API, Next internals, and static assets. API
  // routes (incl. /api/auth) are shared and need no host routing.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|widget.js|robots.txt|sitemap.xml|uploads/).*)",
  ],
};
