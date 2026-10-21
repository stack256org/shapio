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
  it("only In Progress / Completed / Declined are columns by default", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);

    const columns = await getDerivedRoadmap(ws.id, { isAdmin: true });
    expect(columns.map((c) => c.slug)).toEqual([
      "in_progress",
      "completed",
      "declined",
    ]);
    // Draft and In Review (intake) must NEVER be roadmap columns by default.
    expect(columns.map((c) => c.slug)).not.toContain("draft");
    expect(columns.map((c) => c.slug)).not.toContain("in_review");
  });

  it("In Review and Draft feedback never appear on the roadmap", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);
    const board = await createTestBoard({
      workspaceId: ws.id,
      createdBy: owner.id,
    });

    const inProgress = await createTestPost({
      boardId: board.id,
      workspaceId: ws.id,
      authorId: owner.id,
      authorEmail: owner.email,
      status: "in_progress",
    });
    // An "in_review" (intake) post — must not surface anywhere.
    await createTestPost({
      boardId: board.id,
      workspaceId: ws.id,
      authorId: owner.id,
      authorEmail: owner.email,
      status: "in_review",
    });
    // An in-progress post that is still an unpublished DRAFT — must not surface.
    const draft = await createTestPost({
      boardId: board.id,
      workspaceId: ws.id,
      authorId: owner.id,
      authorEmail: owner.email,
      status: "in_progress",
    });
    await db.update(posts).set({ isDraft: true }).where(eq(posts.id, draft.id));
    // An in-progress post hidden/spam (isApproved = false) — must not surface, even
    // in the admin/team view.
    const hidden = await createTestPost({
      boardId: board.id,
      workspaceId: ws.id,
      authorId: owner.id,
      authorEmail: owner.email,
      status: "in_progress",
    });
    await db
      .update(posts)
      .set({ isApproved: false })
      .where(eq(posts.id, hidden.id));

    const columns = await getDerivedRoadmap(ws.id, { isAdmin: true });
    const inProgressCol = columns.find((c) => c.slug === "in_progress")!;
    const ids = inProgressCol.posts.map((p) => p.id);

    expect(ids).toContain(inProgress.id);
    expect(ids).not.toContain(draft.id); // draft excluded
    expect(ids).not.toContain(hidden.id); // spam/hidden excluded
    // The "in_review" post is nowhere across all columns.
    const allIds = columns.flatMap((c) => c.posts.map((p) => p.id));
    expect(allIds).toHaveLength(1);
  });

  it("a status becomes a column only once its roadmap flag is turned on", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);

    let columns = await getDerivedRoadmap(ws.id, { isAdmin: true });
    expect(columns.map((c) => c.slug)).not.toContain("in_review");

    const inReview = await getWorkspaceStatusBySlug(ws.id, "in_review");
    await updateWorkspaceStatus(inReview!.id, { showOnRoadmap: true });

    columns = await getDerivedRoadmap(ws.id, { isAdmin: true });
    expect(columns.map((c) => c.slug)).toContain("in_review");

    // Sanity: the seed set the right defaults.
    const statuses = await getWorkspaceStatuses(ws.id);
    const on = statuses
      .filter((s) => s.showOnRoadmap)
      .map((s) => s.slug)
      .sort();
    expect(on).toEqual(["completed", "declined", "in_progress", "in_review"]);
  });
});
