"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { toggleFeatureFlagAction } from "@/app/actions/orbit-feature-flags";
import { Switch } from "@/components/ui/switch";

interface Props {
  flagKey: string;
  isEnabled: boolean;
}

export function FeatureFlagToggle({ flagKey, isEnabled }: Props) {
  const [optimisticEnabled, setOptimistic] = useOptimistic(isEnabled);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !optimisticEnabled;
    startTransition(async () => {
      setOptimistic(next);
      const result = await toggleFeatureFlagAction(flagKey, next);
      if (result.error) {
        setOptimistic(!next);
        toast.error(result.error);
      }
    });
  }

  return (
    <Switch
      aria-label={optimisticEnabled ? "Disable flag" : "Enable flag"}
      checked={optimisticEnabled}
      disabled={isPending}
      onCheckedChange={toggle}
    />
  );
}
