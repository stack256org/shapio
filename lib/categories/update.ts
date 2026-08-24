import { and, eq, ne } from "drizzle-orm";
import { categories } from "@/db/schema";
import { db } from "@/lib/db";

export async function updateCategory(
  categoryId: string,
  input: {
    name?: string;
    description?: string | null;
    color?: string;
    displayOrder?: number;
    isArchived?: boolean;
  }
) {
  await db
    .update(categories)
    .set({
      ...input,
      name: input.name?.trim(),
      updatedAt: new Date(),
    })
    .where(eq(categories.id, categoryId));
}

export async function setDefaultCategory(
  workspaceId: string,
  categoryId: string
) {
  await db.transaction(async (tx) => {
    await tx
      .update(categories)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(categories.workspaceId, workspaceId),
          ne(categories.id, categoryId)
        )
      );
    await tx
      .update(categories)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(categories.id, categoryId));
  });
}

export async function reorderCategories(
  workspaceId: string,
  orderedIds: string[]
) {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(categories)
        .set({ displayOrder: i, updatedAt: new Date() })
        .where(
          and(
            eq(categories.id, orderedIds[i]!),
            eq(categories.workspaceId, workspaceId)
          )
        );
    }
  });
}
