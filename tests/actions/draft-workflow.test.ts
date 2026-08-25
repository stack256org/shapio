import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { posts } from "@/db/schema/posts";
import { db } from "@/lib/db";
import {
  createTestBoard,
  createTestUser,
  createTestWorkspace,
} from "../setup/fixtures";
import { resetDb } from "../setup/reset-db";

// Session + async side-effects are the only things that need faking; everything
// else runs against the real test DB through the actual server actions.
const sessionUser = vi.hoisted(() => ({
  value: { id: "", email: "", name: "" as string | null },
}));

vi.mock("@/lib/authz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/authz")>();
  return {
    ...actual,
    requireSession: vi.fn(async () => ({ user: sessionUser.value })),
    getCurrentSession: vi.fn(async () => ({ user: sessionUser.value })),
  };
});
vi.mock("@/lib/worker/enqueue", () => ({
  enqueueJob: vi.fn(async () => undefined),
}));
// revalidatePath needs a Next request/static-generation context that the test
// runner has no way to provide; it's a no-op concern for these assertions.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { createPostAction, publishPostAction } from "@/app/actions/posts";

async function setup() {
  const owner = await createTestUser();
  const ws = await createTestWorkspace(owner.id, owner.email);
  const board = await createTestBoard({
    workspaceId: ws.id,
    createdBy: owner.id,
  });
  sessionUser.value = { id: owner.id, email: owner.email, name: owner.name };
  return { owner, ws, board };
}

async function saveDraft(
  board: { id: string },
  ws: { id: string },
  title: string
) {
  const res = await createPostAction({
    boardId: board.id,
    workspaceId: ws.id,
    title,
    saveAsDraft: true,
  });
  if (!res.success) {
    throw new Error(`createPostAction failed: ${res.error}`);
  }
  return res.data;
}

async function isDraftInDb(postId: string) {
  const [row] = await db
    .select({ isDraft: posts.isDraft })
    .from(posts)
    .where(eq(posts.id, postId));
  return row?.isDraft;
}

describe("draft lifecycle — unlimited create/publish", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("supports draft → publish → draft → draft → publish independently", async () => {
    const { ws, board } = await setup();

    // 1. First draft
    const d1 = await saveDraft(board, ws, "Draft One");
    expect(d1.isDraft).toBe(true);
    expect(await isDraftInDb(d1.postId)).toBe(true);

    // 2. Publish it
    const pub1 = await publishPostAction({
      postId: d1.postId,
      workspaceId: ws.id,
    });
    expect(pub1.success).toBe(true);
    expect(await isDraftInDb(d1.postId)).toBe(false);

    // 3. THE REPORTED STEP — create another draft after publishing
    const d2 = await saveDraft(board, ws, "Draft Two");
    expect(d2.isDraft).toBe(true);
    expect(await isDraftInDb(d2.postId)).toBe(true);

    // 4. And another, with the SAME title as an existing one (slug collision path)
    const d3 = await saveDraft(board, ws, "Draft Two");
    expect(d3.isDraft).toBe(true);
    expect(d3.postId).not.toBe(d2.postId);

    // 5. Publish one draft; the other stays a draft (independent)
    const pub2 = await publishPostAction({
      postId: d2.postId,
      workspaceId: ws.id,
    });
    expect(pub2.success).toBe(true);
    expect(await isDraftInDb(d2.postId)).toBe(false);
    expect(await isDraftInDb(d3.postId)).toBe(true);

    // 6. Still able to create more drafts afterward
    const d4 = await saveDraft(board, ws, "Draft Four");
    expect(d4.isDraft).toBe(true);
  });

  it("publishing is idempotent and never blocks new drafts", async () => {
    const { ws, board } = await setup();
    const d1 = await saveDraft(board, ws, "Only Draft");
    await publishPostAction({ postId: d1.postId, workspaceId: ws.id });
    // Publish again (double-click / re-publish) — must be a harmless no-op
    const again = await publishPostAction({
      postId: d1.postId,
      workspaceId: ws.id,
    });
    expect(again.success).toBe(true);
    // New draft still works
    const d2 = await saveDraft(board, ws, "Another Draft");
    expect(d2.isDraft).toBe(true);
  });
});
