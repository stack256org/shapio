"use client";

import { Skeleton } from "@/components/ui/skeleton";

// Matches EmbedModalHeader's exact height/padding/border so a route
// transition inside the widget (Categories -> Roadmap/Changelog) never shows
// a differently-sized header while data loads — only the body swaps to a
// spinner. The title itself isn't a skeleton: the caller always knows which
// route this is ("Roadmap"/"Changelog"), so showing the real text
// immediately reduces the perceived flash instead of adding one.
export function PanelLoadingSkeleton({ title }: { title: string }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ir-background">
      <header className="flex shrink-0 items-center gap-2 border-b border-ir-border bg-ir-surface px-3 py-3">
        <Skeleton className="size-8 shrink-0 rounded-ir-sm" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-ir-heading">
          {title}
        </h2>
        <Skeleton className="size-8 shrink-0 rounded-ir-sm" />
      </header>
      <div className="flex flex-1 items-center justify-center">
        <div
          aria-label="Loading"
          className="size-6 animate-spin rounded-full border-2 border-ir-border border-t-ir-primary"
          role="status"
        />
      </div>
    </div>
  );
}
