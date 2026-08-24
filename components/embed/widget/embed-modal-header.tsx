"use client";

import { ArrowLeftIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { requestWidgetClose } from "@/lib/embed/widget-messages";

interface EmbedModalHeaderProps {
  // Real navigation back to the board route (roadmap/changelog, rendered by
  // a Server Component page — a client callback can't be passed through as
  // a prop there). Mutually exclusive with onBack; onBack wins if both are
  // somehow given.
  backHref?: string;
  icon?: ReactNode;
  // Client-state transition back to Categories (used by EmbedWidgetShell,
  // which stays mounted the whole time — no real navigation needed).
  onBack?: () => void;
  title: string;
}

const iconButtonClass =
  "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-ir-sm text-ir-muted transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40";

// Shared chrome for every screen inside the widget's modal (Categories, Form,
// Success, Roadmap, Changelog) so switching between them reads as one
// continuous surface rather than a different page each time. Close always
// asks the host page's panel to close via the same postMessage protocol
// (requestWidgetClose) — every usage of this header wants that same
// behavior, so it isn't a prop.
export function EmbedModalHeader({
  backHref,
  icon,
  onBack,
  title,
}: EmbedModalHeaderProps) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-ir-border bg-ir-surface px-3 py-3">
      {onBack ? (
        <button
          aria-label="Back"
          className={iconButtonClass}
          onClick={onBack}
          type="button"
        >
          <ArrowLeftIcon className="size-4" />
        </button>
      ) : (
        backHref && (
          <Link aria-label="Back" className={iconButtonClass} href={backHref}>
            <ArrowLeftIcon className="size-4" />
          </Link>
        )
      )}
      {icon}
      <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-ir-heading">
        {title}
      </h2>
      <button
        aria-label="Close"
        className={iconButtonClass}
        onClick={requestWidgetClose}
        type="button"
      >
        <XIcon className="size-4" />
      </button>
    </header>
  );
}
