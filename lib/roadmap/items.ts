import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq, sql } from "drizzle-orm";
import { roadmapItems } from "@/db/schema";
import { db } from "@/lib/db";

export type RoadmapItemRow = typeof roadmapItems.$inferSelect;

export async function getRoadmapItems(
  workspaceId: string
): Promise<RoadmapItemRow[]> {
  return db
    .select()
    .from(roadmapItems)
    .where(eq(roadmapItems.workspaceId, workspaceId))
    .orderBy(asc(roadmapItems.displayOrder), asc(roadmapItems.createdAt));
}

export async function getRoadmapItemById(id: string) {
  const [row] = await db
    .select()
    .from(roadmapItems)
    .where(eq(roadmapItems.id, id))
    .limit(1);
  return row ?? null;
}

async function getNextDisplayOrder(statusId: string): Promise<number> {
  const [row] = await db
    .select({
      maxOrder: sql<number>`COALESCE(MAX(${roadmapItems.displayOrder}), -1)`,
    })
    .from(roadmapItems)
    .where(eq(roadmapItems.statusId, statusId));
  return (row?.maxOrder ?? -1) + 1;
}

export async function createRoadmapItem(input: {
  workspaceId: string;
  statusId: string;
  title: string;
  description?: string | null;
  launchDate?: Date | null;
  coverImage?: string | null;
  feedbackId?: string | null;
}): Promise<RoadmapItemRow> {
  const displayOrder = await getNextDisplayOrder(input.statusId);
  const [item] = await db
    .insert(roadmapItems)
    .values({
      id: createId(),
      workspaceId: input.workspaceId,
      statusId: input.statusId,
      title: input.title.trim(),
      description: input.description ?? null,
      launchDate: input.launchDate ?? null,
      coverImage: input.coverImage ?? null,
      feedbackId: input.feedbackId ?? null,
      displayOrder,
    })
    .returning();
  return item!;
}

export async function updateRoadmapItem(
  itemId: string,
  input: {
    title?: string;
    description?: string | null;
    launchDate?: Date | null;
    coverImage?: string | null;
    statusId?: string;
    feedbackId?: string | null;
  }
): Promise<void> {
  await db
    .update(roadmapItems)
    .set({
      title: input.title?.trim(),
      description: input.description,
      launchDate: input.launchDate,
      coverImage: input.coverImage,
      statusId: input.statusId,
      feedbackId: input.feedbackId,
      updatedAt: new Date(),
    })
    .where(eq(roadmapItems.id, itemId));
}

export async function deleteRoadmapItem(itemId: string): Promise<void> {
  await db.delete(roadmapItems).where(eq(roadmapItems.id, itemId));
}

// Apply a full drag-and-drop result for a single target column: the item lands
// in `statusId` and every card in that column is renumbered to `orderedIds`.
// Runs in one transaction so the board never persists a half-moved state.
export async function moveRoadmapItem(input: {
  workspaceId: string;
  itemId: string;
  statusId: string;
  orderedIds: string[];
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(roadmapItems)
      .set({ statusId: input.statusId, updatedAt: new Date() })
      .where(
        and(
          eq(roadmapItems.id, input.itemId),
          eq(roadmapItems.workspaceId, input.workspaceId)
        )
      );
    for (let i = 0; i < input.orderedIds.length; i++) {
      await tx
        .update(roadmapItems)
        .set({ displayOrder: i, updatedAt: new Date() })
        .where(
          and(
            eq(roadmapItems.id, input.orderedIds[i]!),
            eq(roadmapItems.workspaceId, input.workspaceId)
          )
        );
    }
  });
}
