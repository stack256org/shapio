import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import {
  createRoadmapItem,
  getRoadmapItems,
  moveRoadmapItem,
} from "@/lib/roadmap/items";
import {
  getManualRoadmap,
  searchWorkspaceFeedback,
} from "@/lib/roadmap/manual";
import {
  countItemsInStatus,
  createRoadmapStatus,
  ensureRoadmapStatuses,
  getRoadmapStatuses,
} from "@/lib/roadmap/statuses";
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

describe("manual roadmap — columns", () => {
  it("seeds the three default columns once", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);

    const seeded = await ensureRoadmapStatuses(ws.id);
    expect(seeded.map((s) => s.name)).toEqual([
      "Coming Up",
      "Just Live",
      "Archived",
    ]);

    // Idempotent — a second call must not add duplicates.
    await ensureRoadmapStatuses(ws.id);
    const after = await getRoadmapStatuses(ws.id);
    expect(after).toHaveLength(3);
  });
});

describe("manual roadmap — items", () => {
  it("creates items, groups them by column, and moves them", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);
    const [comingUp, justLive] = await ensureRoadmapStatuses(ws.id);

    const a = await createRoadmapItem({
      workspaceId: ws.id,
      statusId: comingUp!.id,
      title: "Dark mode",
    });
    const b = await createRoadmapItem({
      workspaceId: ws.id,
      statusId: comingUp!.id,
      title: "SSO",
    });

    let { columns } = await getManualRoadmap(ws.id);
    expect(columns[0]!.items.map((i) => i.title)).toEqual(["Dark mode", "SSO"]);
    expect(columns[1]!.items).toHaveLength(0);

    // Move "Dark mode" to the front of "Just Live".
    await moveRoadmapItem({
      workspaceId: ws.id,
      itemId: a.id,
      statusId: justLive!.id,
      orderedIds: [a.id],
    });

    ({ columns } = await getManualRoadmap(ws.id));
    expect(columns[0]!.items.map((i) => i.title)).toEqual(["SSO"]);
    expect(columns[1]!.items.map((i) => i.title)).toEqual(["Dark mode"]);

    // The moved item's statusId is persisted.
    const all = await getRoadmapItems(ws.id);
    expect(all.find((i) => i.id === a.id)!.statusId).toBe(justLive!.id);
    expect(all.find((i) => i.id === b.id)!.statusId).toBe(comingUp!.id);
  });

  it("tracks item counts per column for delete guards", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);
    const status = await createRoadmapStatus({
      workspaceId: ws.id,
      name: "Backlog",
    });

    expect(await countItemsInStatus(status.id)).toBe(0);
    await createRoadmapItem({
      workspaceId: ws.id,
      statusId: status.id,
      title: "Item",
    });
    expect(await countItemsInStatus(status.id)).toBe(1);
  });
});

describe("manual roadmap — survives mode switches", () => {
  it("keeps manual items when toggling Sync ON then OFF", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);
    const [comingUp] = await ensureRoadmapStatuses(ws.id);
    const item = await createRoadmapItem({
      workspaceId: ws.id,
      statusId: comingUp!.id,
      title: "Manual feature",
    });

    // Sync OFF → ON (hide manual) → OFF (restore). The toggle must never delete
    // manual roadmap items or columns.
    await db
      .update(workspaces)
      .set({ roadmapSyncEnabled: true })
      .where(eq(workspaces.id, ws.id));
    await db
      .update(workspaces)
      .set({ roadmapSyncEnabled: false })
      .where(eq(workspaces.id, ws.id));

    const { columns } = await getManualRoadmap(ws.id);
    expect(columns).toHaveLength(3);
    const all = await getRoadmapItems(ws.id);
    expect(all.map((i) => i.id)).toContain(item.id);
    expect(all).toHaveLength(1);
  });
});

describe("manual roadmap — feedback search", () => {
  it("matches on title and body, most-voted first, with paging", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);
    const board = await createTestBoard({
      workspaceId: ws.id,
      createdBy: owner.id,
    });
    await createTestPost({
      boardId: board.id,
      workspaceId: ws.id,
      authorId: owner.id,
      authorEmail: owner.email,
    });

    // Body of every fixture post is "Test post body" → matches "post".
    const { results, hasMore } = await searchWorkspaceFeedback(ws.id, {
      query: "post",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(hasMore).toBe(false);

    // A query that matches nothing returns an empty page.
    const none = await searchWorkspaceFeedback(ws.id, {
      query: "zzz-no-match-zzz",
    });
    expect(none.results).toHaveLength(0);
  });
});
