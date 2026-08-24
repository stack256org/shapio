import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq, sql } from "drizzle-orm";
import { roadmapItems, roadmapStatuses } from "@/db/schema";
import { db } from "@/lib/db";
import { DEFAULT_ROADMAP_STATUSES } from "./defaults";

export type RoadmapStatusRow = typeof roadmapStatuses.$inferSelect;

export async function getRoadmapStatuses(
  workspaceId: string
): Promise<RoadmapStatusRow[]> {
  return db
    .select()
    .from(roadmapStatuses)
    .where(eq(roadmapStatuses.workspaceId, workspaceId))
    .orderBy(asc(roadmapStatuses.displayOrder), asc(roadmapStatuses.createdAt));
}

export async function getRoadmapStatusById(id: string) {
  const [row] = await db
    .select()
    .from(roadmapStatuses)
    .where(eq(roadmapStatuses.id, id))
    .limit(1);
  return row ?? null;
}

// Idempotently ensure a workspace has manual roadmap columns. Called when the
// Sync toggle is turned off and defensively when a manual roadmap is rendered,
// so a manual roadmap is never a blank canvas with no columns.
export async function ensureRoadmapStatuses(
  workspaceId: string
): Promise<RoadmapStatusRow[]> {
  const existing = await getRoadmapStatuses(workspaceId);
  if (existing.length > 0) {
    return existing;
  }
  await db.insert(roadmapStatuses).values(
    DEFAULT_ROADMAP_STATUSES.map((s) => ({
      id: createId(),
      workspaceId,
      name: s.name,
      color: s.color,
      displayOrder: s.displayOrder,
    }))
  );
  return getRoadmapStatuses(workspaceId);
}

async function getNextDisplayOrder(workspaceId: string): Promise<number> {
  const [row] = await db
    .select({
      maxOrder: sql<number>`COALESCE(MAX(${roadmapStatuses.displayOrder}), -1)`,
    })
    .from(roadmapStatuses)
    .where(eq(roadmapStatuses.workspaceId, workspaceId));
  return (row?.maxOrder ?? -1) + 1;
}

export async function createRoadmapStatus(input: {
  workspaceId: string;
  name: string;
  color?: string;
}): Promise<RoadmapStatusRow> {
  const displayOrder = await getNextDisplayOrder(input.workspaceId);
  const [status] = await db
    .insert(roadmapStatuses)
    .values({
      id: createId(),
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      color: input.color ?? "#6b7280",
      displayOrder,
    })
    .returning();
  return status!;
}

export async function updateRoadmapStatus(
  statusId: string,
  input: { name?: string; color?: string }
): Promise<void> {
  await db
    .update(roadmapStatuses)
    .set({
      name: input.name?.trim(),
      color: input.color,
      updatedAt: new Date(),
    })
    .where(eq(roadmapStatuses.id, statusId));
}

export async function reorderRoadmapStatuses(
  workspaceId: string,
  orderedIds: string[]
): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(roadmapStatuses)
        .set({ displayOrder: i, updatedAt: new Date() })
        .where(
          and(
            eq(roadmapStatuses.id, orderedIds[i]!),
            eq(roadmapStatuses.workspaceId, workspaceId)
          )
        );
    }
  });
}

export async function countItemsInStatus(statusId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roadmapItems)
    .where(eq(roadmapItems.statusId, statusId));
  return row?.count ?? 0;
}

// Deleting a column is blocked while it still holds items (the DB FK is
// "restrict"); callers must move or delete the items first. This keeps deletions
// safe and never silently orphans cards.
export async function deleteRoadmapStatus(statusId: string): Promise<void> {
  await db.delete(roadmapStatuses).where(eq(roadmapStatuses.id, statusId));
}
