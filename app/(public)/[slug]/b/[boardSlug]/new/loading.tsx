import { Skeleton } from "@/components/ui/skeleton";

export default function NewPostLoading() {
  return (
    <div className="min-h-screen bg-ir-background">
      <div className="mx-auto max-w-5xl">
        <div className="border-b border-ir-border px-8 py-4">
          <Skeleton className="h-5 w-32" />
        </div>

        <div className="space-y-5 px-8 py-8">
          <Skeleton className="mb-6 h-6 w-40" />

          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-ir-input" />
          </div>

          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-32 w-full rounded-ir-input" />
          </div>

          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-ir-input" />
          </div>

          <div className="flex justify-end gap-3 border-t border-ir-border pt-5">
            <Skeleton className="h-9 w-20 rounded-ir-sm" />
            <Skeleton className="h-9 w-32 rounded-ir-button" />
          </div>
        </div>
      </div>
    </div>
  );
}
