"use client";

// Bearer-token storage for the embed widget only — never imported outside
// components/embed/** and the mutation call sites that use embedFetch
// (lib/embed/fetch.ts). sessionStorage, not localStorage: bounds exposure
// to the current tab's lifetime rather than persisting indefinitely (see
// the implementation plan's security review). Wrapped in try/catch since
// sessionStorage can throw in private-browsing/storage-partitioned
// contexts — same defensive pattern already used for the draft storage in
// new-post-form.tsx.

const TOKEN_KEY = "ir-embed-token";

// The native `storage` event only fires in OTHER browsing contexts (other
// frames/tabs) observing the same storage area — never in the same window
// that made the write (per the Web Storage spec). That's exactly right for
// notifying a sibling widget iframe on the same host page, but it means
// every OTHER already-mounted component in THIS SAME window/iframe (e.g.
// every other comment's own CommentReactions instance, every other
// VoteButton on a list page) never learns about a sign-in it didn't
// perform itself — discovered while verifying that reacting to an
// already-rendered comment right after signing in elsewhere on the same
// page worked. Dispatching a same-window custom event alongside every
// write closes that gap without changing the public API any consumer
// already uses — onEmbedTokenChange still fires for both cases.
const SAME_WINDOW_EVENT = "ir-embed-token-change";

export function getEmbedToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setEmbedToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    window.dispatchEvent(new Event(SAME_WINDOW_EVENT));
  } catch {
    // no-op — see module comment
  }
}

export function clearEmbedToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event(SAME_WINDOW_EVENT));
  } catch {
    // no-op — see module comment
  }
}

// sessionStorage's `storage` event fires across same-tab, same-origin
// frames (unlike its cross-tab behavior for localStorage) — so a second
// widget instance embedded on the same host page picks up a token written
// by the first one live, no reload needed. The same-window custom event
// (dispatched by setEmbedToken/clearEmbedToken above) covers every other
// component instance within THIS window/iframe, which the storage event
// never reaches.
export function onEmbedTokenChange(callback: () => void): () => void {
  function storageHandler(event: StorageEvent) {
    if (event.storageArea === sessionStorage && event.key === TOKEN_KEY) {
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
