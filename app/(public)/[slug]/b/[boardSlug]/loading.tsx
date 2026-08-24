"use client";

import { useSearchParams } from "next/navigation";
import { PanelLoadingSkeleton } from "@/components/embed/widget/panel-loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function BoardLoading() {
  const searchParams = useSearchParams();
  const isPanel =
    searchParams.get("embed") === "1" && searchParams.get("layout") === "panel";

  if (isPanel) {
    return <PanelLoadingSkeleton title="Share your feedback" />;
  }

  return (
    <div className="min-h-screen bg-ir-background">
      {/* Portal header */}
      <div className="border-b border-ir-border px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-ir-sm" />
            <Skeleton className="h-8 w-8 rounded-ir-full" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar */}
          <div className="w-full shrink-0 space-y-3 lg:w-56">
            <Skeleton className="h-10 w-full rounded-ir-button" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                className="h-8 w-full rounded-ir-sm"
                key={`sidebar-item-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                  i
                }`}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="min-w-0 flex-1 rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
            <div className="flex items-center gap-2.5 border-b border-ir-border px-4 py-4">
              <Skeleton className="h-9 flex-1 rounded-ir-input" />
              <Skeleton className="h-9 w-24 rounded-ir-input" />
              <Skeleton className="h-9 w-24 rounded-ir-input" />
            </div>
            <div className="divide-y divide-ir-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  className="flex items-stretch"
                  key={`post-row-${
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                    i
                  }`}
                >
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-1 border-r border-ir-border px-2 py-4">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-6" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5 px-4 py-4">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
