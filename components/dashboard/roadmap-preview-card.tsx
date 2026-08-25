import {
  ArrowRightIcon as ArrowRight,
  MapTrifoldIcon as MapTrifold,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface RoadmapPreviewCardProps {
  roadmapPublic: boolean;
  workspaceSlug: string;
}

export function RoadmapPreviewCard({
  roadmapPublic,
  workspaceSlug,
}: RoadmapPreviewCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-ir-card border border-ir-border bg-ir-surface px-5 py-4 shadow-ir-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-ir-sm bg-ir-primary-light/20 text-ir-primary">
          <MapTrifold className="size-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ir-heading">Roadmap</h2>
          <p className="mt-0.5 text-xs text-ir-muted">
            {roadmapPublic
              ? "Your roadmap is live and visible to customers."
              : "Share what's planned, in progress, and shipped."}
          </p>
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
        {roadmapPublic && (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/${workspaceSlug}/roadmap`}>View Public Roadmap</Link>
          </Button>
        )}
        <Button asChild size="sm" variant="outline">
          <Link href={`/${workspaceSlug}/settings/roadmap`}>
            Manage Roadmap
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
