import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-ir-card border border-ir-border bg-ir-surface px-5 py-4 shadow-ir-xs ${className ?? ""}`}
    >
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-7 w-14" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col">
      <div className="space-y-8 px-4 py-8 sm:px-8">
        {/* Workspace overview */}
        <div className="flex flex-col gap-4 rounded-ir-card border border-ir-border bg-ir-surface px-5 py-4 shadow-ir-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-ir-sm" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-ir-full" />
            <Skeleton className="h-6 w-24 rounded-ir-full" />
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              className="flex items-center gap-3 rounded-ir-card border border-ir-border bg-ir-surface px-4 py-3.5 shadow-ir-xs"
              key={`quick-action-${
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                i
              }`}
            >
              <Skeleton className="size-8 rounded-ir-sm" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton
              key={`stat-${
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                i
              }`}
            />
          ))}
        </div>

        {/* Feedback trend */}
        <div className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
          <div className="flex items-center justify-between gap-4 border-b border-ir-border px-5 py-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-7 w-10" />
          </div>
          <div className="px-5 py-4">
            <Skeleton className="h-48 w-full rounded-ir-sm" />
          </div>
        </div>

        {/* Breakdown + Live Stream */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs"
              key={`panel-${
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                i
              }`}
            >
              <div className="flex items-center justify-between gap-4 border-b border-ir-border px-5 py-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-28 rounded-ir-sm" />
              </div>
              <div className="divide-y divide-ir-border">
                {Array.from({ length: 4 }).map((_, rowIndex) => (
                  <div
                    className="flex items-center justify-between gap-4 px-5 py-3.5"
                    key={`panel-row-${
                      // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                      rowIndex
                    }`}
                  >
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Roadmap preview */}
        <div className="flex flex-col gap-4 rounded-ir-card border border-ir-border bg-ir-surface px-5 py-4 shadow-ir-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-ir-sm" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <Skeleton className="h-8 w-36 rounded-ir-button" />
        </div>

        {/* Newest feedback */}
        <div className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
          <div className="flex items-center justify-between gap-4 border-b border-ir-border px-5 py-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-20 rounded-ir-sm" />
          </div>
          <div className="divide-y divide-ir-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                className="flex items-center gap-4 px-5 py-4"
                key={`feedback-row-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                  i
                }`}
              >
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-ir-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
