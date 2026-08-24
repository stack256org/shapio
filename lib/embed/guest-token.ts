"use client";

// Signed guest-identity storage for the embed widget — the accountless
// counterpart to token.ts. That module holds a Better Auth session token
// (a real account); this one holds a signed "this email is verified" payload
// with no account behind it at all (see lib/portal/guest-identity.ts).
//
// The widget needs its own transport because its iframe is cross-site
// relative to the page hosting it: browsers refuse to send the SameSite=Lax
// guest cookie there, so the value is replayed on the X-Portal-Guest header
// instead. The server verifies its HMAC either way, so a client holding the
// token can neither forge nor alter the email inside it.
//
// localStorage, not sessionStorage: unlike a bearer session token, this is
// not a credential for an account — it only asserts a verified email, and
// the visitor's whole reason for using the widget is to not sign in
// repeatedly. Losing it every tab close would mean re-entering a code far
// too often. It carries its own signed expiry (30 days) regardless.
// Wrapped in try/catch since storage can throw in private-browsing or
// storage-partitioned contexts.

const GUEST_KEY = "ir-portal-guest";

// Mirrors token.ts: the native `storage` event never fires in the window
// that performed the write, so a same-window custom event is dispatched
// alongside it to reach other components in THIS iframe.
const SAME_WINDOW_EVENT = "ir-portal-guest-change";

export function getGuestToken(): string | null {
  try {
    return localStorage.getItem(GUEST_KEY);
  } catch {
    return null;
  }
}

export function setGuestToken(token: string): void {
  try {
    localStorage.setItem(GUEST_KEY, token);
    window.dispatchEvent(new Event(SAME_WINDOW_EVENT));
  } catch {
    // no-op — see module comment
  }
}

export function clearGuestToken(): void {
  try {
    localStorage.removeItem(GUEST_KEY);
    window.dispatchEvent(new Event(SAME_WINDOW_EVENT));
  } catch {
    // no-op — see module comment
  }
}

export function onGuestTokenChange(callback: () => void): () => void {
  function storageHandler(event: StorageEvent) {
    if (event.key === GUEST_KEY) {
      callback();
    }
  }
  window.addEventListener("storage", storageHandler);
  window.addEventListener(SAME_WINDOW_EVENT, callback);
  return () => {
    window.removeEventListener("storage", storageHandler);
    window.removeEventListener(SAME_WINDOW_EVENT, callback);
  };
}
