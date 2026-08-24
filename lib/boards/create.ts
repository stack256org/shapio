import { createId } from "@paralleldrive/cuid2";
import { eq, sql } from "drizzle-orm";
import { boards } from "@/db/schema";
import { db } from "@/lib/db";

async function getNextDisplayOrder(workspaceId: string): Promise<number> {
  const [row] = await db
    .select({
      maxOrder: sql<number>`COALESCE(MAX(${boards.displayOrder}), -1)`,
    })
    .from(boards)
    .where(eq(boards.workspaceId, workspaceId));
  return (row?.maxOrder ?? -1) + 1;
}

export async function createBoard(input: {
  workspaceId: string;
  name: string;
  slug: string;
  description?: string | null;
  isPublic: boolean;
  createdBy: string;
}) {
  const displayOrder = await getNextDisplayOrder(input.workspaceId);
  const [board] = await db
    .insert(boards)
    .values({
      id: createId(),
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      slug: input.slug,
      description: input.description?.trim() || null,
      isPublic: input.isPublic,
      displayOrder,
      createdBy: input.createdBy,
    })
    .returning();
  return board!;
}
