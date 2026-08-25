"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

// Shared landing page for both the Google popup and the magic-link email —
// self-closes when opened as a popup (window.opener set); otherwise (the
// magic-link email opened a new tab) shows a short confirmation, since
// EmbedAuthPanel in the original tab is already polling the session and
// will pick this up on its own.
//
// When opened as the embed widget's Google popup specifically, the opener
// is a cross-site iframe — its own session cookie won't persist there (see
// the implementation plan), so this page relays its session's bearer token
// back via postMessage before closing, the same way the OTP path in
// EmbedAuthPanel captures one directly from its sign-in response.
export default function EmbedAuthCompletePage() {
  const [canAutoClose, setCanAutoClose] = useState(true);

  useEffect(() => {
    if (!window.opener) {
      setCanAutoClose(false);
      return;
    }

    let cancelled = false;

    async function relayAndClose() {
      const { data } = await authClient.getSession();
      if (!cancelled && data?.session.token) {
        window.opener?.postMessage(
          {
            source: "shapio-widget",
            type: "embed-auth-token",
            token: data.session.token,
          },
          window.location.origin
        );
      }
      window.close();
    }

    relayAndClose();
    const timer = setTimeout(() => setCanAutoClose(false), 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="grid min-h-screen place-items-center bg-ir-background px-4">
      <div className="max-w-sm text-center">
        <p className="text-base font-semibold text-ir-heading">
          You're signed in.
        </p>
        <p className="mt-1.5 text-sm text-ir-muted">
          {canAutoClose
            ? "This window will close automatically…"
            : "You can close this tab and go back to where you started."}
        </p>
      </div>
    </div>
  );
}
