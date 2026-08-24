"use client";

import { useSearchParams } from "next/navigation";
import { PanelLoadingSkeleton } from "@/components/embed/widget/panel-loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function RoadmapLoading() {
  const searchParams = useSearchParams();
  const isPanel =
    searchParams.get("embed") === "1" && searchParams.get("layout") === "panel";

  if (isPanel) {
    return <PanelLoadingSkeleton title="Roadmap" />;
  }

  return (
    <div className="min-h-screen bg-ir-background">
      <div className="border-b border-ir-border px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-8 rounded-ir-full" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, colIndex) => (
            <div
              className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs"
              key={`column-${
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                colIndex
              }`}
            >
              <div className="flex items-center justify-between border-b border-ir-border px-4 py-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-6" />
              </div>
              <div className="space-y-3 p-3">
                {Array.from({ length: 3 }).map((_, cardIndex) => (
                  <div
                    className="space-y-2 rounded-ir-sm border border-ir-border p-3"
                    key={
                      // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                      `card-${colIndex}-${cardIndex}`
                    }
                  >
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
