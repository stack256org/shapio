"use client";

import { useEffect, useState } from "react";

// Whether this page is rendered inside ANY iframe — not tied to the `embed=1`
// query param (see useIsEmbed) because pages reachable here, like /signin,
// get there via `next=` redirects that don't carry embed state on the
// /signin URL itself. Starts false (matches SSR, avoids a hydration
// mismatch) and flips after mount once `window` is available.
export function useIsEmbedded(): boolean {
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    setIsEmbedded(window.self !== window.top);
  }, []);

  return isEmbedded;
}
