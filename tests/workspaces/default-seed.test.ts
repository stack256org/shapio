import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { categories, workspaceStatuses } from "@/db/schema";
import { db } from "@/lib/db";
import { createTestUser, createTestWorkspace } from "../setup/fixtures";
import { resetDb } from "../setup/reset-db";

// createTestWorkspace() calls the real createWorkspace(), so this exercises the
// actual onboarding transaction.
describe("workspace onboarding — default seed data", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("seeds the 3 default categories on workspace creation", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);

    const rows = await db
      .select({ name: categories.name, slug: categories.slug })
      .from(categories)
      .where(eq(categories.workspaceId, ws.id))
      .orderBy(asc(categories.displayOrder));

    expect(rows.map((r) => r.slug)).toEqual([
      "feature-request",
      "bug",
      "improvement",
    ]);
    expect(rows.map((r) => r.name)).toEqual([
      "Feature Request",
      "Bug",
      "Improvement",
    ]);
  });

  it("still seeds the default statuses (no regression)", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);

    const statuses = await db
      .select({ slug: workspaceStatuses.slug })
      .from(workspaceStatuses)
      .where(eq(workspaceStatuses.workspaceId, ws.id));

    expect(statuses).toHaveLength(6);
    expect(statuses.map((s) => s.slug)).toContain("open");
  });
});
