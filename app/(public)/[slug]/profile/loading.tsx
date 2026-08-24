import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-ir-background">
      <div className="border-b border-ir-border px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-8 rounded-ir-full" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-8">
        <Skeleton className="h-6 w-32" />

        <div className="flex items-center gap-4 rounded-ir-card border border-ir-border bg-ir-surface p-5">
          <Skeleton className="size-14 rounded-ir-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-56" />
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="rounded-ir-card border border-ir-border bg-ir-surface">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                className="flex items-center gap-3 border-b border-ir-border px-4 py-3 last:border-b-0"
                key={`profile-post-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order never changes
                  i
                }`}
              >
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
