import { and, asc, count, eq } from "drizzle-orm";
import { categories, posts } from "@/db/schema";
import { db } from "@/lib/db";

export async function getCategoriesForWorkspace(workspaceId: string) {
  return db
    .select()
    .from(categories)
    .where(eq(categories.workspaceId, workspaceId))
    .orderBy(asc(categories.displayOrder), asc(categories.name));
}

export async function getActiveCategoriesForWorkspace(workspaceId: string) {
  return db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.workspaceId, workspaceId),
        eq(categories.isArchived, false)
      )
    )
    .orderBy(asc(categories.displayOrder), asc(categories.name));
}

export async function getCategoryById(id: string) {
  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return row ?? null;
}

export async function getCategoryBySlug(workspaceId: string, slug: string) {
  const [row] = await db
    .select()
    .from(categories)
    .where(
      and(eq(categories.workspaceId, workspaceId), eq(categories.slug, slug))
    )
    .limit(1);
  return row ?? null;
}

export async function getDefaultCategory(workspaceId: string) {
  const [row] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.workspaceId, workspaceId),
        eq(categories.isDefault, true)
      )
    )
    .limit(1);
  return row ?? null;
}

/** How many posts currently use this category — used to block deleting a
 * category that's still in use. */
export async function countPostsInCategory(
  categoryId: string
): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(posts)
    .where(eq(posts.categoryId, categoryId));
  return value;
}
