"use client";

import { type MouseEvent, useState } from "react";
import { ImageLightbox } from "@/components/ui/image-lightbox";

// Renders a changelog entry's sanitized HTML body. Inline <img> tags aren't
// discrete React elements we can wrap in ImagePreviewThumbnail, so clicks are
// caught via delegation and routed to the shared lightbox instead.
export function ChangelogRenderedBody({
  className,
  html,
}: {
  className?: string;
  html: string;
}) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLImageElement) {
      setLightboxSrc(target.currentSrc || target.src);
    }
  };

  return (
    <>
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: click only opens the lightbox for an inline <img> inside this rendered HTML, not a new interaction on the div itself */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: same — delegated click target is an <img>, which stays keyboard/click-operable via its own semantics */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: same — no new interaction is added to the div; images aren't made keyboard-focusable here */}
      <div
        className={className}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-side sanitized via DOMPurify
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={handleClick}
      />
      <ImageLightbox
        onOpenChange={(open) => {
          if (!open) {
            setLightboxSrc(null);
          }
        }}
        open={lightboxSrc !== null}
        src={lightboxSrc}
      />
    </>
  );
}
