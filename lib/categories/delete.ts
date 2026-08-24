import { eq } from "drizzle-orm";
import { categories, posts } from "@/db/schema";
import { db } from "@/lib/db";

export async function deleteCategory(categoryId: string) {
  await db.transaction(async (tx) => {
    // Nullify posts referencing this category
    await tx
      .update(posts)
      .set({ categoryId: null, updatedAt: new Date() })
      .where(eq(posts.categoryId, categoryId));

    await tx.delete(categories).where(eq(categories.id, categoryId));
  });
}
