import Image from "next/image";
import type { WidgetHostConfig } from "@/lib/embed/queries";

// Picked from WidgetHostConfig (the same type GET /api/embed/config returns
// and public/widget.js consumes) rather than an independently hand-written
// interface, so this preview's prop shape can't quietly drift from what the
// live widget actually receives — even though the two remain two separately
// implemented renderers (this one React, the real one vanilla DOM) that
// can't share runtime code.
type WidgetPreviewProps = Pick<
  WidgetHostConfig,
  | "accentColor"
  | "buttonType"
  | "floatingIconType"
  | "floatingPosition"
  | "stickyButtonColor"
  | "stickyButtonText"
  | "stickyPosition"
  | "stickyTextColor"
> & {
  // WidgetHostConfig allows null (unset in the DB) — this preview's caller
  // already normalizes that to "" via its own local form state.
  floatingIconUrl: string;
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// A small hand-built visual match for what public/widget.js actually
// renders on a host page — can't literally reuse that vanilla-DOM script
// inside a React settings page, so this is kept in lock-step with it by
// hand (same corner logic, same colors) rather than sharing code.
export function WidgetPreview({
  accentColor,
  buttonType,
  floatingIconType,
  floatingIconUrl,
  floatingPosition,
  stickyButtonColor,
  stickyButtonText,
  stickyPosition,
  stickyTextColor,
}: WidgetPreviewProps) {
  const safeAccent = HEX_COLOR.test(accentColor) ? accentColor : "#111111";
  const safeStickyBg = HEX_COLOR.test(stickyButtonColor)
    ? stickyButtonColor
    : "#111111";
  const safeStickyText = HEX_COLOR.test(stickyTextColor)
    ? stickyTextColor
    : "#ffffff";

  const floatingCorner: React.CSSProperties = {
    [floatingPosition.startsWith("bottom") ? "bottom" : "top"]: 16,
    [floatingPosition.endsWith("left") ? "left" : "right"]: 16,
  };

  const stickyCorner: React.CSSProperties = stickyPosition.endsWith("top")
    ? {
        [stickyPosition.startsWith("left") ? "left" : "right"]: 0,
        top: 20,
      }
    : stickyPosition.endsWith("bottom")
      ? {
          [stickyPosition.startsWith("left") ? "left" : "right"]: 0,
          bottom: 20,
        }
      : {
          [stickyPosition.startsWith("left") ? "left" : "right"]: 0,
          top: "50%",
          transform: "translateY(-50%)",
        };

  return (
    <div className="relative mt-3 h-64 overflow-hidden rounded-ir-sm border border-ir-border bg-ir-surface">
      {/* A stand-in "your website" backdrop */}
      <div className="space-y-2 p-3">
        <div className="h-2.5 w-2/3 rounded-full bg-ir-muted-surface" />
        <div className="h-2.5 w-1/2 rounded-full bg-ir-muted-surface" />
        <div className="h-2.5 w-5/6 rounded-full bg-ir-muted-surface" />
      </div>

      {buttonType === "floating" ? (
        <div
          className="absolute flex size-11 items-center justify-center rounded-full shadow-md"
          style={{
            ...floatingCorner,
            background: safeAccent,
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          }}
        >
          {floatingIconType === "custom" && floatingIconUrl ? (
            // biome-ignore lint/performance/noImgElement: preview of a site-owner-provided external icon URL, not a static asset
            <img
              alt=""
              className="size-6 object-contain"
              src={floatingIconUrl}
            />
          ) : (
            <Image alt="" height={22} src="/logo.svg" width={22} />
          )}
        </div>
      ) : (
        <div
          className="absolute flex items-center rounded-l-md rounded-r-md px-2.5 py-3 text-[11px] font-semibold tracking-wide"
          style={{
            ...stickyCorner,
            background: safeStickyBg,
            color: safeStickyText,
            writingMode: "vertical-rl",
            transform:
              "transform" in stickyCorner
                ? `${stickyCorner.transform} rotate(180deg)`
                : "rotate(180deg)",
            // Always rotated 180deg (see transform above), which visually
            // swaps left/right corners — so the radius is set inverted here
            // to land rounded on the inward-facing side once rotated.
            borderRadius: stickyPosition.startsWith("left")
              ? "0 6px 6px 0"
              : "6px 0 0 6px",
          }}
        >
          {stickyButtonText}
        </div>
      )}
    </div>
  );
}
