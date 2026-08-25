"use client";

import { clearGuestToken, getGuestToken } from "@/lib/embed/guest-token";
import {
  clearEmbedToken,
  getEmbedToken,
  setEmbedToken,
} from "@/lib/embed/token";

// Single point of control for embed bearer auth (implementation-plan
// Ground Rule 2): every embed mutation call site imports embedFetch
// instead of calling fetch directly, and never touches the token or the
// Authorization header itself. Flipping EMBED_BEARER_ENABLED to false
// makes every call site behave exactly like plain fetch again — a
// one-place kill switch, not something spread across components.
export const EMBED_BEARER_ENABLED = true;

// Better Auth's bearer plugin re-issues the session token on the
// `set-auth-token` response header whenever it reissues the session
// (sign-in, and the updateAge sliding-expiry refresh) — reading it on
// every response keeps the stored token fresh for free, no separate
// polling needed. See node_modules/better-auth/dist/plugins/bearer/index.mjs.
export async function embedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);

  if (EMBED_BEARER_ENABLED) {
    const token = getEmbedToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  // Accountless identity for a visitor who only verified an email — the
  // widget's normal path now (see lib/embed/guest-token.ts). Sent alongside,
  // not instead of, the bearer token: a real signed-in account still wins
  // server-side (getPortalActor prefers the session), so a workspace member
  // testing their own widget keeps acting as themselves.
  const guestToken = getGuestToken();
  if (guestToken) {
    headers.set("X-Portal-Guest", guestToken);
  }

  const response = await fetch(input, { ...init, headers });

  if (EMBED_BEARER_ENABLED) {
    const refreshed = response.headers.get("set-auth-token");
    if (refreshed) {
      setEmbedToken(refreshed);
    } else if (response.status === 401) {
      // A 401 with no fresh token means the stored one is no longer
      // valid (expired, revoked, or signed out elsewhere) — drop it so
      // the next attempt doesn't keep sending a dead credential. The
      // caller's existing UNAUTHENTICATED/401 handling reopens the
      // sign-in dialog; the draft is preserved by the existing
      // sessionStorage draft mechanism, unrelated to this token.
      clearEmbedToken();
      // Same reasoning for the guest identity: a 401 while holding one means
      // it expired (or the instance turned accountless participation off), so
      // stop replaying it and let the visitor verify again.
      clearGuestToken();
    }
  }

  return response;
}
