import { PageBody } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrbitUserDetailLoading() {
  return (
    <PageBody>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            className="rounded-ir-card border border-ir-border bg-ir-surface p-4 shadow-ir-xs"
            key={`meta-${
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
              i
            }`}
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs"
            key={`panel-${
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
              i
            }`}
          >
            <div className="border-b border-ir-border px-4 py-3">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-3 px-4 py-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </PageBody>
  );
}
