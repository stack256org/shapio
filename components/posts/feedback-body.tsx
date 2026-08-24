"use client";

import { type MouseEvent, useState } from "react";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { sanitizeChangelogHtml } from "@/lib/changelog/html";

// Renders a feedback post's description. New posts are written with the Quill
// editor and stored as HTML; older posts are plain text. Detect which and
// render accordingly, so pre-existing plain-text posts keep their line breaks
// while rich-text posts render their formatting (code, lists, quotes, …).
const looksLikeHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);

export function FeedbackBody({
  body,
  className,
}: {
  body: string;
  className?: string;
}) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Body HTML can contain inline <img> tags (pasted/uploaded into the Quill
  // editor) that aren't discrete React elements we can wrap — open the
  // shared lightbox via delegated click instead.
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLImageElement) {
      setLightboxSrc(target.currentSrc || target.src);
    }
  };

  if (looksLikeHtml(body)) {
    return (
      <>
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: click only opens the lightbox for an inline <img> inside this rendered HTML, not a new interaction on the div itself */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: same — delegated click target is an <img>, which stays keyboard/click-operable via its own semantics */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: same — no new interaction is added to the div; images aren't made keyboard-focusable here */}
        <div
          className={`comment-body ${className ?? ""}`}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized HTML from our own Quill editor
          dangerouslySetInnerHTML={{ __html: sanitizeChangelogHtml(body) }}
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
  return <p className={`whitespace-pre-wrap ${className ?? ""}`}>{body}</p>;
}
