import { PageBody } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrbitFeatureFlagsLoading() {
  return (
    <PageBody>
      <div className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
        <div className="divide-y divide-ir-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              className="flex items-center justify-between gap-4 px-5 py-4"
              key={`flag-${
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                i
              }`}
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-4.5 w-8.25 rounded-ir-full" />
            </div>
          ))}
        </div>
      </div>
    </PageBody>
  );
}
