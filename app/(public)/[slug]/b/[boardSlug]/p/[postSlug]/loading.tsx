"use client";

import { useSearchParams } from "next/navigation";
import { PanelLoadingSkeleton } from "@/components/embed/widget/panel-loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function PostDetailLoading() {
  const searchParams = useSearchParams();
  const isPanel =
    searchParams.get("embed") === "1" && searchParams.get("layout") === "panel";

  if (isPanel) {
    return <PanelLoadingSkeleton title="Feedback" />;
  }

  return (
    <div className="min-h-screen bg-ir-background">
      <div className="border-b border-ir-border px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-8 rounded-ir-full" />
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-8">
        <Skeleton className="h-4 w-24" />

        <div className="flex gap-4 rounded-ir-card border border-ir-border bg-ir-surface p-5">
          <Skeleton className="h-14 w-12 shrink-0 rounded-ir-sm" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              className="flex gap-3"
              key={`comment-${
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                i
              }`}
            >
              <Skeleton className="size-8 shrink-0 rounded-ir-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
