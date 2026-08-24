"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/authz";
import {
  deleteOrbitWorkspace,
  suspendWorkspace,
  unsuspendWorkspace,
} from "@/lib/orbit/workspaces";

export async function suspendWorkspaceAction(
  workspaceId: string
): Promise<{ error?: string }> {
  const session = await requireAdmin();

  try {
    await suspendWorkspace(workspaceId, session.user.id, session.user.email);
    revalidatePath("/orbit/workspaces");
    revalidatePath(`/orbit/workspaces/${workspaceId}`);
    return {};
  } catch (error) {
    console.error("[orbit] suspendWorkspace failed", error);
    return { error: "Failed to suspend workspace" };
  }
}

export async function unsuspendWorkspaceAction(
  workspaceId: string
): Promise<{ error?: string }> {
  const session = await requireAdmin();

  try {
    await unsuspendWorkspace(workspaceId, session.user.id, session.user.email);
    revalidatePath("/orbit/workspaces");
    revalidatePath(`/orbit/workspaces/${workspaceId}`);
    return {};
  } catch (error) {
    console.error("[orbit] unsuspendWorkspace failed", error);
    return { error: "Failed to unsuspend workspace" };
  }
}

export async function deleteOrbitWorkspaceAction(
  workspaceId: string
): Promise<{ error?: string }> {
  const session = await requireAdmin();

  try {
    await deleteOrbitWorkspace(
      workspaceId,
      session.user.id,
      session.user.email
    );
    revalidatePath("/orbit/workspaces");
    return {};
  } catch (error) {
    console.error("[orbit] deleteWorkspace failed", error);
    return { error: "Failed to delete workspace" };
  }
}
