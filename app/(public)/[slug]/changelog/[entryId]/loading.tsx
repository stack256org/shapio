"use client";

import { useSearchParams } from "next/navigation";
import { PanelLoadingSkeleton } from "@/components/embed/widget/panel-loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChangelogEntryLoading() {
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

      <div className="mx-auto max-w-3xl space-y-6 px-4 pt-10 pb-20 sm:px-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-2/3" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-14 rounded-ir-sm" />
          <Skeleton className="h-7 w-14 rounded-ir-sm" />
          <Skeleton className="h-7 w-8 rounded-ir-sm" />
        </div>
      </div>
    </div>
  );
}
