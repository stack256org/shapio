"use client";

import { useEffect } from "react";

// Renders nothing — reports this page's content height to the parent window
// whenever it changes, so widget.js can size the iframe to fit (no internal
// scrollbar). Only mounted when the page is rendered in embed mode; a no-op
// if the page isn't actually inside an iframe.
export function EmbedResizeReporter() {
  useEffect(() => {
    if (window.parent === window) {
      return;
    }

    function postHeight() {
      window.parent.postMessage(
        {
          source: "shapio-widget",
          type: "resize",
          height: document.body.scrollHeight,
        },
        "*"
      );
    }

    let frame: number | null = null;
    const observer = new ResizeObserver(() => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      frame = requestAnimationFrame(postHeight);
    });
    observer.observe(document.body);
    postHeight();

    return () => {
      observer.disconnect();
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    };
  }, []);

  return null;
}
