import { createId } from "@paralleldrive/cuid2";
import { eq, sql } from "drizzle-orm";
import { categories } from "@/db/schema";
import { DEFAULT_CATEGORIES } from "@/lib/categories/defaults";
import { db } from "@/lib/db";

// Seed the workspace's default categories. Bulk-insert with fixed values
// (mirrors seedDefaultStatuses) — a fresh workspace has no existing categories,
// so no slug de-duplication is needed. Accepts an optional transaction so it can
// run atomically inside createWorkspace().
export async function seedDefaultCategories(
  workspaceId: string,
  tx?: Parameters<Parameters<typeof db.transaction>[0]>[0]
) {
  const executor = tx ?? db;
  await executor.insert(categories).values(
    DEFAULT_CATEGORIES.map((c) => ({
      id: createId(),
      workspaceId,
      name: c.name,
      slug: c.slug,
      color: c.color,
      displayOrder: c.displayOrder,
      // The first seeded category is the workspace's default — every post
      // needs one, so a fresh workspace can't end up with none.
      isDefault: c.displayOrder === 0,
    }))
  );
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 64) || "category"
  );
}

async function generateCategorySlug(
  workspaceId: string,
  name: string
): Promise<string> {
  const base = slugify(name);
  const existing = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(
      sql`${categories.workspaceId} = ${workspaceId} AND ${categories.slug} LIKE ${base + "%"}`
    );
  const taken = new Set(existing.map((r) => r.slug));
  if (!taken.has(base)) {
    return base;
  }
  let i = 2;
  while (taken.has(`${base}-${i}`)) {
    i++;
  }
  return `${base}-${i}`;
}

async function getNextDisplayOrder(workspaceId: string): Promise<number> {
  const [row] = await db
    .select({
      maxOrder: sql<number>`COALESCE(MAX(${categories.displayOrder}), -1)`,
    })
    .from(categories)
    .where(eq(categories.workspaceId, workspaceId));
  return (row?.maxOrder ?? -1) + 1;
}

export async function createCategory(input: {
  workspaceId: string;
  name: string;
  description?: string | null;
  color?: string;
}) {
  const slug = await generateCategorySlug(input.workspaceId, input.name);
  const displayOrder = await getNextDisplayOrder(input.workspaceId);

  const [category] = await db
    .insert(categories)
    .values({
      id: createId(),
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      color: input.color ?? "#6366f1",
      displayOrder,
    })
    .returning();
  return category!;
}
