"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/authz";

export async function grantAdminAction(
  targetUserId: string
): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const { grantAdmin } = await import("@/lib/orbit/users");

  try {
    await grantAdmin(targetUserId, session.user.id, session.user.email);
    revalidatePath("/orbit/users");
    revalidatePath(`/orbit/users/${targetUserId}`);
    return {};
  } catch (error) {
    console.error("[orbit] grantAdmin failed", error);
    return { error: "Failed to grant admin access" };
  }
}

export async function revokeAdminAction(
  targetUserId: string
): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const { revokeAdmin } = await import("@/lib/orbit/users");

  try {
    await revokeAdmin(targetUserId, session.user.id, session.user.email);
    revalidatePath("/orbit/users");
    revalidatePath(`/orbit/users/${targetUserId}`);
    return {};
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to revoke admin access";
    return { error: message };
  }
}
