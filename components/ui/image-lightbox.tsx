"use client";

import {
  ArrowSquareOutIcon,
  ArrowsCounterClockwiseIcon,
  DownloadSimpleIcon,
  FileImageIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformEffect,
} from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface ImageLightboxProps {
  alt?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  src: string | null;
}

const MIN_SCALE = 1;
const MAX_SCALE = 8;

// The controlled fullscreen preview used by ImagePreviewThumbnail and by any
// other surface that needs to open a zoomable/pannable image preview from a
// dynamic src (e.g. an <img> clicked inside rendered rich-text content).
export function ImageLightbox({
  alt = "",
  onOpenChange,
  open,
  src,
}: ImageLightboxProps) {
  const filename = src ? filenameFromSrc(src) : "";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="flex h-[85vh] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-ir-xl border border-ir-border bg-ir-surface p-0 shadow-ir-xl sm:max-w-5xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Image preview</DialogTitle>
        {/* Unmounted while closed so scale/position reset for next open,
            and so the pan/zoom listeners aren't live in the background. */}
        {open && src && (
          <TransformWrapper
            centerOnInit
            centerZoomedOut
            doubleClick={{ mode: "toggle", step: MAX_SCALE / 2 }}
            initialScale={MIN_SCALE}
            maxScale={MAX_SCALE}
            minScale={MIN_SCALE}
            panning={{ velocityDisabled: true }}
            pinch={{ step: 5 }}
            wheel={{ step: 0.2 }}
          >
            <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-ir-border px-4">
              <div className="flex min-w-0 items-center gap-2">
                <FileImageIcon className="size-4 shrink-0 text-ir-muted" />
                <span
                  className="truncate text-sm font-medium text-ir-heading"
                  title={filename}
                >
                  {filename}
                </span>
              </div>
              <LightboxToolbarActions
                onClose={() => onOpenChange(false)}
                src={src}
              />
            </div>
            {/* Fixed-size box — deliberately NOT sized to the image. The
                library's own wrapper/content divs default to fit-content,
                which only settles to the image's true box after it finishes
                loading; centerOnInit/centerZoomedOut run before that, so
                they'd center against a stale (often near-empty) measurement.
                A hard size here (overridden onto those wrapper/content divs
                via wrapperStyle/contentStyle below) is stable from the very
                first paint, and object-contain on the <img> itself does the
                aspect-ratio-correct fit natively — no measurement or load
                timing involved, so it's correct for every image size. */}
            <div className="relative flex-1 overflow-hidden bg-ir-muted-surface">
              <TransformComponent
                contentStyle={{ height: "100%", width: "100%" }}
                wrapperStyle={{ height: "100%", width: "100%" }}
              >
                <LightboxImage alt={alt} src={src} />
              </TransformComponent>
            </div>
          </TransformWrapper>
        )}
      </DialogContent>
    </Dialog>
  );
}

function filenameFromSrc(src: string): string {
  if (src.startsWith("blob:") || src.startsWith("data:")) {
    return "image";
  }
  try {
    const { pathname } = new URL(src, "http://localhost");
    const last = pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last) : "image";
  } catch {
    return "image";
  }
}

function LightboxImage({ alt, src }: { alt: string; src: string }) {
  return (
    // biome-ignore lint/performance/noImgElement: dynamic S3/R2/local upload or blob preview URL, not known at build time for next/image
    <img
      alt={alt}
      className="size-full object-contain"
      draggable={false}
      src={src}
    />
  );
}

function LightboxToolbarActions({
  onClose,
  src,
}: {
  onClose: () => void;
  src: string;
}) {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const [scale, setScale] = useState(MIN_SCALE);

  useTransformEffect(({ state }) => {
    setScale(state.scale);
  });

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        aria-label="Zoom out"
        disabled={scale <= MIN_SCALE}
        onClick={() => zoomOut()}
        size="icon-sm"
        variant="ghost"
      >
        <MagnifyingGlassMinusIcon />
      </Button>
      <span className="w-11 shrink-0 text-center text-xs font-medium tabular-nums text-ir-muted">
        {Math.round(scale * 100)}%
      </span>
      <Button
        aria-label="Zoom in"
        disabled={scale >= MAX_SCALE}
        onClick={() => zoomIn()}
        size="icon-sm"
        variant="ghost"
      >
        <MagnifyingGlassPlusIcon />
      </Button>
      <Button
        aria-label="Reset zoom"
        disabled={scale <= MIN_SCALE}
        onClick={() => resetTransform()}
        size="icon-sm"
        variant="ghost"
      >
        <ArrowsCounterClockwiseIcon />
      </Button>
      <div className="mx-1.5 h-5 w-px bg-ir-border" />
      <Button asChild size="icon-sm" variant="ghost">
        <a aria-label="Download image" download href={src} rel="noreferrer">
          <DownloadSimpleIcon />
        </a>
      </Button>
      <Button asChild size="icon-sm" variant="ghost">
        <a
          aria-label="Open image in new tab"
          href={src}
          rel="noreferrer"
          target="_blank"
        >
          <ArrowSquareOutIcon />
        </a>
      </Button>
      <Button
        aria-label="Close preview"
        onClick={onClose}
        size="icon-sm"
        variant="ghost"
      >
        <XIcon />
      </Button>
    </div>
  );
}
