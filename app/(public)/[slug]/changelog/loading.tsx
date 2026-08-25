"use client";

import { useSearchParams } from "next/navigation";
import { PanelLoadingSkeleton } from "@/components/embed/widget/panel-loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChangelogLoading() {
  const searchParams = useSearchParams();
  const isPanel =
    searchParams.get("embed") === "1" && searchParams.get("layout") === "panel";

  if (isPanel) {
    return <PanelLoadingSkeleton title="Changelog" />;
  }

  return (
    <div className="min-h-screen bg-ir-background">
      <div className="border-b border-ir-border px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-8 rounded-ir-full" />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 pt-10 pb-20">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />

        <div className="mt-6 flex gap-2.5">
          <Skeleton className="h-9 min-w-50 flex-1 rounded-ir-input" />
          <Skeleton className="h-9 w-24 rounded-ir-input" />
        </div>

        <div className="relative mt-10 space-y-10 border-l border-ir-border pl-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              className="relative"
              key={`entry-${
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                i
              }`}
            >
              <span className="absolute top-1.5 -left-8 size-2 -translate-x-1/2 rounded-ir-full bg-ir-border" />
              <Skeleton className="h-3 w-24" />
              <div className="mt-3 space-y-2 rounded-ir-card border border-ir-border bg-ir-surface p-5 shadow-ir-xs">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
