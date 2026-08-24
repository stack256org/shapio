"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/authz";
import { toggleFlag } from "@/lib/orbit/feature-flags";

export async function toggleFeatureFlagAction(
  key: string,
  isEnabled: boolean
): Promise<{ error?: string }> {
  const session = await requireAdmin();

  try {
    await toggleFlag(key, isEnabled);

    await audit({
      action: "feature_flag.toggled",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: `Feature flag '${key}' ${isEnabled ? "enabled" : "disabled"}`,
      entityId: key,
      entityName: key,
      entityType: "platform",
      workspaceId: null,
    });

    revalidatePath("/orbit/feature-flags");
    return {};
  } catch (error) {
    console.error("[orbit] toggleFeatureFlag failed", error);
    return { error: "Failed to update feature flag" };
  }
}
