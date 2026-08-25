"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { setRoadmapSyncAction } from "@/app/actions/roadmap";
import { Switch } from "@/components/ui/switch";

interface RoadmapSyncToggleProps {
  enabled: boolean;
  workspaceId: string;
}

// Inline "Sync from Feedback" control shown in the roadmap page header so admins
// can flip modes without visiting settings (Upvoty-style). Brand Admin only —
// only rendered by the page when the viewer is an admin.
export function RoadmapSyncToggle({
  workspaceId,
  enabled,
}: RoadmapSyncToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle(value: boolean) {
    if (value === enabled || isPending) {
      return;
    }
    startTransition(async () => {
      const result = await setRoadmapSyncAction({
        workspaceId,
        enabled: value,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        value
          ? "Roadmap now syncs from feedback"
          : "Roadmap is now managed manually"
      );
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-sm font-medium text-ir-muted">
        Sync from Feedback
      </span>
      <Switch
        aria-label="Sync roadmap from feedback"
        checked={enabled}
        disabled={isPending}
        onCheckedChange={toggle}
        size="default"
      />
      <span
        className={`text-xs font-semibold ${enabled ? "text-ir-primary" : "text-ir-muted"}`}
      >
        {enabled ? "On" : "Off"}
      </span>
    </div>
  );
}
