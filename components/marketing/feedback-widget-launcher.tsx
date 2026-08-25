"use client";

import { useEffect } from "react";

interface FeedbackWidgetLauncherProps {
  appUrl: string;
}

const LAUNCHER_SCRIPT_ID = "shapio-feedback-widget-launcher-script";

// Floating bottom-right launcher button that opens the same feedback board
// embedded inline via FeedbackWidgetSection. Rendered on every public
// marketing page so visitors can leave feedback from anywhere on the site.
//
// Injected imperatively via a plain DOM <script> element — not next/script's
// <Script>, and not a raw JSX <script> tag:
// - next/script dedupes injected scripts by `src`, and FeedbackWidgetSection
//   loads this same widget.js on the homepage — with next/script, only
//   whichever mounted first would actually execute, silently dropping the
//   other instance.
// - A raw <script> tag in JSX only executes as part of the initial
//   server-rendered HTML parse; React never runs it during a client-side
//   render, so it would silently no-op on any client-side (App Router)
//   navigation back to this page.
//
// Guarded by id so remounting (e.g. navigating away and back without a full
// reload) doesn't inject — and boot — a second launcher button; widget.js has
// no teardown hook, so once mounted it just keeps running.
export function FeedbackWidgetLauncher({
  appUrl,
}: FeedbackWidgetLauncherProps) {
  useEffect(() => {
    if (document.getElementById(LAUNCHER_SCRIPT_ID)) {
      return;
    }

    // Button type, colors, theme, position, etc. all come from this
    // workspace's Settings → Embed configuration, fetched live by widget.js
    // — nothing about the widget's appearance is hardcoded here anymore.
    const script = document.createElement("script");
    script.id = LAUNCHER_SCRIPT_ID;
    script.src = `${appUrl}/widget.js`;
    script.dataset.workspace = "testtestetetete";
    document.body.appendChild(script);
  }, [appUrl]);

  return null;
}
