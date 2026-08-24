import { createId } from "@paralleldrive/cuid2";
import { eq, sql } from "drizzle-orm";
import { workspaceStatuses } from "@/db/schema";
import { db } from "@/lib/db";
import { DEFAULT_WORKSPACE_STATUSES } from "./defaults";

export async function seedDefaultStatuses(
  workspaceId: string,
  tx?: Parameters<Parameters<typeof db.transaction>[0]>[0]
) {
  const executor = tx ?? db;
  await executor.insert(workspaceStatuses).values(
    DEFAULT_WORKSPACE_STATUSES.map((s) => ({
      id: createId(),
      workspaceId,
      name: s.name,
      slug: s.slug,
      color: s.color,
      displayOrder: s.displayOrder,
      isDefault: s.isDefault,
      showOnRoadmap: s.showOnRoadmap,
      showOnPublicFeed: s.showOnPublicFeed,
      isSystem: s.isSystem,
    }))
  );
}

async function getNextDisplayOrder(workspaceId: string): Promise<number> {
  const [row] = await db
    .select({
      maxOrder: sql<number>`COALESCE(MAX(${workspaceStatuses.displayOrder}), -1)`,
    })
    .from(workspaceStatuses)
    .where(eq(workspaceStatuses.workspaceId, workspaceId));
  return (row?.maxOrder ?? -1) + 1;
}

export async function createWorkspaceStatus(input: {
  workspaceId: string;
  name: string;
  color?: string;
}) {
  const slug =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/-+/g, "_")
      .slice(0, 64) || "status";

  const displayOrder = await getNextDisplayOrder(input.workspaceId);

  const [status] = await db
    .insert(workspaceStatuses)
    .values({
      id: createId(),
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      slug,
      color: input.color ?? "#6b7280",
      displayOrder,
      isDefault: false,
    })
    .returning();
  return status!;
}
