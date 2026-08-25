import { and, eq, ne } from "drizzle-orm";
import { postStatusChanges, posts, workspaceStatuses } from "@/db/schema";
import { db } from "@/lib/db";

export async function deleteWorkspaceStatus(
  statusId: string,
  actor?: { id: string; name: string | null }
) {
  const status = await db
    .select()
    .from(workspaceStatuses)
    .where(eq(workspaceStatuses.id, statusId))
    .limit(1);

  if (!status[0]) {
    return;
  }

  if (status[0].isSystem) {
    throw new Error(
      "This status is required by the system and cannot be deleted."
    );
  }

  // Ensure at least one status remains and we're not deleting the last one
  const remaining = await db
    .select({ id: workspaceStatuses.id })
    .from(workspaceStatuses)
    .where(
      and(
        eq(workspaceStatuses.workspaceId, status[0].workspaceId),
        ne(workspaceStatuses.id, statusId),
        eq(workspaceStatuses.isArchived, false)
      )
    );

  if (remaining.length === 0) {
    throw new Error("Cannot delete the only active status.");
  }

  const [draft] = await db
    .select()
    .from(workspaceStatuses)
    .where(
      and(
        eq(workspaceStatuses.workspaceId, status[0].workspaceId),
        eq(workspaceStatuses.isSystem, true)
      )
    )
    .limit(1);

  if (!draft) {
    throw new Error("No system fallback status found for this workspace.");
  }

  await db.transaction(async (tx) => {
    const affected = await tx
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          eq(posts.workspaceId, status[0]!.workspaceId),
          eq(posts.status, status[0]!.slug)
        )
      );

    if (affected.length > 0) {
      await tx
        .update(posts)
        .set({ status: draft.slug, updatedAt: new Date() })
        .where(
          and(
            eq(posts.workspaceId, status[0]!.workspaceId),
            eq(posts.status, status[0]!.slug)
          )
        );

      await tx.insert(postStatusChanges).values(
        affected.map((p) => ({
          postId: p.id,
          fromStatus: status[0]!.slug,
          toStatus: draft.slug,
          changedBy: actor?.id ?? null,
          changedByName: actor?.name ?? null,
          note: `Automatically moved to Draft — the "${status[0]!.name}" status was deleted.`,
        }))
      );
    }

    await tx
      .delete(workspaceStatuses)
      .where(eq(workspaceStatuses.id, statusId));
  });
}
