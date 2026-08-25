"use client";

import { useEffect, useState } from "react";
import { embedFetch } from "@/lib/embed/fetch";
import { getGuestToken, onGuestTokenChange } from "@/lib/embed/guest-token";
import {
  clearEmbedToken,
  getEmbedToken,
  onEmbedTokenChange,
} from "@/lib/embed/token";

// Central "am I signed in" source of truth for every embed-aware
// component — a drop-in replacement for `useState(isSignedIn)` that keeps
// silent-token-restore logic, AND live sync across every widget instance
// mounted on the same host page, in one place (the embed auth layer)
// instead of reimplemented per component.
//
// Outside the embed (isEmbed=false) this is a plain pass-through to the
// server-computed isSignedIn prop — Admin Panel and Public Portal never
// exercise anything below that check, since cookie auth already resolved
// isSignedIn correctly server-side before the component even rendered.
//
// Inside the embed, isSignedIn from the server is always false (the
// session cookie never persists there — see the implementation plan), so
// this validates the sessionStorage token against the server
// (GET /api/auth/get-session) — a present token is never assumed valid on
// its own — at two triggers, both driven by the SAME `onEmbedTokenChange`
// mechanism, not two separate ones:
//   1. This widget's own mount.
//   2. Any OTHER same-page widget instance changing the token (sign-in,
//      sign-out, or clearing an invalid one) — via the `storage` event
//      onEmbedTokenChange already listens for. No polling, no interval.
// A missing token means signed-out immediately (no server round trip
// needed); a present token is always re-validated, never trusted blindly,
// whether it's this widget's own or one a sibling just wrote.
export function useEmbedSignedIn(
  isEmbed: boolean,
  serverIsSignedIn: boolean
): [boolean, (value: boolean) => void] {
  const [signedIn, setSignedIn] = useState(serverIsSignedIn);

  // Another embedded element may complete sign-in and trigger a
  // server-prop refresh (router.refresh()) — sync it explicitly since
  // useState only reads its initial value once. In practice this only
  // ever fires outside the embed, where cookies actually persist; inside
  // the embed serverIsSignedIn is always false, so this is a harmless
  // no-op there.
  useEffect(() => {
    if (serverIsSignedIn) {
      setSignedIn(true);
    }
  }, [serverIsSignedIn]);

  useEffect(() => {
    if (!isEmbed || serverIsSignedIn) {
      return;
    }
    let cancelled = false;

    async function validate() {
      // An accountless visitor who verified their email is "signed in" for
      // every purpose the widget cares about — they may vote, comment, and
      // post. The token is signature-verified server-side on each request, so
      // its mere presence here only decides whether to show the verify dialog,
      // never whether the action is allowed.
      if (getGuestToken()) {
        if (!cancelled) {
          setSignedIn(true);
        }
        return;
      }

      const token = getEmbedToken();
      if (!token) {
        if (!cancelled) {
          setSignedIn(false);
        }
        return;
      }
      try {
        const res = await embedFetch("/api/auth/get-session");
        const data = await res.json();
        if (cancelled) {
          return;
        }
        if (data?.session) {
          setSignedIn(true);
        } else {
          clearEmbedToken();
          setSignedIn(false);
        }
      } catch {
        // A transient network failure isn't proof the token is invalid —
        // leave signedIn state as-is. The next real mutation attempt (or
        // the next sibling-widget token change) validates it for real.
      }
    }

    validate(); // this widget's own mount-time check
    const unsubscribe = onEmbedTokenChange(validate); // live sync from siblings
    // Same live-sync for the accountless identity, so verifying in one widget
    // instance updates every other one on the page without a reload.
    const unsubscribeGuest = onGuestTokenChange(validate);

    return () => {
      cancelled = true;
      unsubscribe();
      unsubscribeGuest();
    };
  }, [isEmbed, serverIsSignedIn]);

  return [signedIn, setSignedIn];
}
