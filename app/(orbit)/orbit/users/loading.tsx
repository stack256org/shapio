import { PageBody } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrbitUsersLoading() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-ir-border px-4 py-3 sm:px-8">
        <Skeleton className="h-9 w-64 rounded-ir-input" />
        <Skeleton className="h-9 w-32 rounded-ir-button" />
      </div>
      <PageBody>
        <div className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
          <div className="divide-y divide-ir-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                className="flex items-center gap-4 px-4 py-3.5"
                key={`row-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                  i
                }`}
              >
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-14 rounded-ir-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </PageBody>
    </>
  );
}
