"use client";

import { useState } from "react";
import { ImageLightbox } from "@/components/ui/image-lightbox";

interface ImagePreviewThumbnailProps {
  alt?: string;
  className?: string;
  src: string;
}

// A thumbnail <img> that opens a larger, zoomable/pannable preview in a
// dialog on click. Used wherever a post/feedback image thumbnail is shown —
// callers keep their own wrapper markup (e.g. a "remove image" button)
// around this.
export function ImagePreviewThumbnail({
  alt = "",
  className,
  src,
}: ImagePreviewThumbnailProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="View larger image"
        className="block w-full cursor-zoom-in rounded-ir-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
        onClick={() => setOpen(true)}
        type="button"
      >
        {/* biome-ignore lint/performance/noImgElement: dynamic S3/R2/local upload or blob preview URL, not known at build time for next/image */}
        <img alt={alt} className={className} src={src} />
      </button>
      <ImageLightbox
        alt={alt}
        onOpenChange={setOpen}
        open={open}
        src={open ? src : null}
      />
    </>
  );
}
