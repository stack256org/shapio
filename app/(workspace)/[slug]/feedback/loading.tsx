"use client";

import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { SetPageHeader } from "@/components/workspace/topbar";
import { AddFeedbackButton } from "./_components/add-feedback-button";

// Mirrors the title/actions this route's page.tsx sets via SetPageHeader
// (same title, same "Add Feedback" button) so the header never reverts to
// the workspace-default (no actions) while this Suspense fallback is
// showing — without it, any navigation slow enough to show this skeleton
// makes the "Add Feedback" button momentarily disappear/reappear once the
// real page mounts. `board` isn't known yet here (that's a DB read the real
// page awaits), so the button always renders optimistically; the rare
// workspace with no board yet loses it again the instant real data lands,
// which is far less disruptive than hiding it for every load.
export default function FeedbackLoading() {
  const params = useParams<{ slug: string }>();

  return (
    <div className="flex flex-col">
      <SetPageHeader
        actions={<AddFeedbackButton slug={params.slug} />}
        title="All Feedback"
      />

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-ir-border px-4 py-4 sm:px-8">
        <Skeleton className="h-9 min-w-50 flex-1 rounded-ir-input" />
        <Skeleton className="h-9 w-28 rounded-ir-input" />
        <Skeleton className="h-9 w-28 rounded-ir-input" />
        <Skeleton className="h-9 w-28 rounded-ir-input" />
      </div>

      {/* Table */}
      <div className="px-4 py-6 sm:px-8">
        <div className="overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
          <div className="divide-y divide-ir-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                className="flex items-center gap-4 px-5 py-4"
                key={`feedback-row-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                  i
                }`}
              >
                <Skeleton className="h-4 w-8 shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20 shrink-0" />
                <Skeleton className="h-5 w-16 shrink-0 rounded-ir-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
