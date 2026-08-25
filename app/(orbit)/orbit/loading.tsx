import { PageBody } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";

function StatCardSkeleton() {
  return (
    <div className="rounded-ir-card border border-ir-border bg-ir-surface p-5 shadow-ir-xs">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-8 w-16" />
    </div>
  );
}

export default function OrbitDashboardLoading() {
  return (
    <PageBody>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton
            key={`stat-${
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
              i
            }`}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs"
            key={`panel-${
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
              i
            }`}
          >
            <div className="flex items-center justify-between border-b border-ir-border px-5 py-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="divide-y divide-ir-border">
              {Array.from({ length: 4 }).map((_, rowIndex) => (
                <div
                  className="flex items-center gap-3 px-5 py-3"
                  key={`row-${
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                    rowIndex
                  }`}
                >
                  <Skeleton className="size-7 shrink-0 rounded-ir-sm" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageBody>
  );
}
