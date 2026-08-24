import { and, eq, ne } from "drizzle-orm";
import { workspaceStatuses } from "@/db/schema";
import { db } from "@/lib/db";

export async function updateWorkspaceStatus(
  statusId: string,
  input: {
    name?: string;
    color?: string;
    displayOrder?: number;
    isDefault?: boolean;
    isArchived?: boolean;
    showOnRoadmap?: boolean;
    showOnPublicFeed?: boolean;
  }
) {
  const [status] = await db
    .select()
    .from(workspaceStatuses)
    .where(eq(workspaceStatuses.id, statusId))
    .limit(1);

  if (!status) {
    throw new Error("Status not found.");
  }

  if (status.isSystem) {
    if (input.name !== undefined && input.name.trim() !== status.name) {
      throw new Error("The Draft status cannot be renamed.");
    }
    if (input.isArchived) {
      throw new Error("The Draft status cannot be archived.");
    }
  }

  await db
    .update(workspaceStatuses)
    .set({
      ...input,
      name: input.name?.trim(),
      updatedAt: new Date(),
    })
    .where(eq(workspaceStatuses.id, statusId));
}

export async function setDefaultStatus(workspaceId: string, statusId: string) {
  await db.transaction(async (tx) => {
    // Clear existing default
    await tx
      .update(workspaceStatuses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(workspaceStatuses.workspaceId, workspaceId),
          ne(workspaceStatuses.id, statusId)
        )
      );
    // Set new default
    await tx
      .update(workspaceStatuses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(workspaceStatuses.id, statusId));
  });
}

export async function reorderWorkspaceStatuses(
  workspaceId: string,
  orderedIds: string[]
) {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(workspaceStatuses)
        .set({ displayOrder: i, updatedAt: new Date() })
        .where(
          and(
            eq(workspaceStatuses.id, orderedIds[i]!),
            eq(workspaceStatuses.workspaceId, workspaceId)
          )
        );
    }
  });
}
