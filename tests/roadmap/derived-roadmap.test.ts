import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { posts } from "@/db/schema";
import { db } from "@/lib/db";
import { getDerivedRoadmap } from "@/lib/roadmap/derived";
import {
  getWorkspaceStatusBySlug,
  getWorkspaceStatuses,
} from "@/lib/workspace-statuses/queries";
import { updateWorkspaceStatus } from "@/lib/workspace-statuses/update";
import {
  createTestBoard,
  createTestPost,
  createTestUser,
  createTestWorkspace,
} from "../setup/fixtures";
import { resetDb } from "../setup/reset-db";

beforeEach(async () => {
  await resetDb();
});

describe("derived roadmap (Sync ON) — status whitelist", () => {
  it("only Planned / In Progress / Completed are columns by default", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);

    const columns = await getDerivedRoadmap(ws.id, { isAdmin: true });
    expect(columns.map((c) => c.slug)).toEqual([
      "planned",
      "in_progress",
      "completed",
    ]);
    // Draft/Open/Under Review/Closed must NEVER be roadmap columns.
    expect(columns.map((c) => c.slug)).not.toContain("open");
    expect(columns.map((c) => c.slug)).not.toContain("under_review");
    expect(columns.map((c) => c.slug)).not.toContain("closed");
  });

  it("Open and Draft feedback never appear on the roadmap", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);
    const board = await createTestBoard({
      workspaceId: ws.id,
      createdBy: owner.id,
    });

    const planned = await createTestPost({
      boardId: board.id,
      workspaceId: ws.id,
      authorId: owner.id,
      authorEmail: owner.email,
      status: "planned",
    });
    // An "open" post — must not surface anywhere.
    await createTestPost({
      boardId: board.id,
      workspaceId: ws.id,
      authorId: owner.id,
      authorEmail: owner.email,
      status: "open",
    });
    // A planned post that is still an unpublished DRAFT — must not surface.
    const draft = await createTestPost({
      boardId: board.id,
      workspaceId: ws.id,
      authorId: owner.id,
      authorEmail: owner.email,
      status: "planned",
    });
    await db.update(posts).set({ isDraft: true }).where(eq(posts.id, draft.id));
    // A planned post hidden/spam (isApproved = false) — must not surface, even
    // in the admin/team view.
    const hidden = await createTestPost({
      boardId: board.id,
      workspaceId: ws.id,
      authorId: owner.id,
      authorEmail: owner.email,
      status: "planned",
    });
    await db
      .update(posts)
      .set({ isApproved: false })
      .where(eq(posts.id, hidden.id));

    const columns = await getDerivedRoadmap(ws.id, { isAdmin: true });
    const plannedCol = columns.find((c) => c.slug === "planned")!;
    const ids = plannedCol.posts.map((p) => p.id);

    expect(ids).toContain(planned.id);
    expect(ids).not.toContain(draft.id); // draft excluded
    expect(ids).not.toContain(hidden.id); // spam/hidden excluded
    // The "open" post is nowhere across all columns.
    const allIds = columns.flatMap((c) => c.posts.map((p) => p.id));
    expect(allIds).toHaveLength(1);
  });

  it("a status becomes a column only once its roadmap flag is turned on", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);

    let columns = await getDerivedRoadmap(ws.id, { isAdmin: true });
    expect(columns.map((c) => c.slug)).not.toContain("closed");

    const closed = await getWorkspaceStatusBySlug(ws.id, "closed");
    await updateWorkspaceStatus(closed!.id, { showOnRoadmap: true });

    columns = await getDerivedRoadmap(ws.id, { isAdmin: true });
    expect(columns.map((c) => c.slug)).toContain("closed");

    // Sanity: the seed set the right defaults.
    const statuses = await getWorkspaceStatuses(ws.id);
    const on = statuses
      .filter((s) => s.showOnRoadmap)
      .map((s) => s.slug)
      .sort();
    expect(on).toEqual(["closed", "completed", "in_progress", "planned"]);
  });
});
