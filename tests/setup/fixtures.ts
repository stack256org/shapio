import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { user as userTable } from "@/db/schema/auth";
import { posts } from "@/db/schema/posts";
import { createBoard } from "@/lib/boards/create";
import { createChangelogEntry } from "@/lib/changelog/create";
import { publishChangelogEntry } from "@/lib/changelog/publish";
import { db } from "@/lib/db";
import { createPost } from "@/lib/posts/queries";
import { createWorkspace } from "@/lib/workspaces/create";

// Fixture helpers for integration tests. These call the same lib-level
// functions the app uses (no duplicated business logic) wherever one exists
// with no Next.js request/session dependency.

export async function createTestUser(overrides?: {
  email?: string;
  name?: string;
}) {
  const id = createId();
  const [row] = await db
    .insert(userTable)
    .values({
      id,
      email: overrides?.email ?? `${id}@example.test`,
      name: overrides?.name ?? "Test User",
      emailVerified: true,
    })
    .returning();
  return row!;
}

export async function createTestWorkspace(ownerId: string, ownerEmail: string) {
  const slug = `ws-${createId()}`;
  const workspaceId = await createWorkspace({
    name: `Workspace ${slug}`,
    slug,
    ownerId,
    ownerEmail,
  });
  return { id: workspaceId, slug };
}

export async function createTestBoard(input: {
  workspaceId: string;
  createdBy: string;
  isPublic?: boolean;
}) {
  const slug = `board-${createId()}`;
  return createBoard({
    workspaceId: input.workspaceId,
    name: `Board ${slug}`,
    slug,
    isPublic: input.isPublic ?? true,
    createdBy: input.createdBy,
  });
}

export async function createTestPost(input: {
  boardId: string;
  workspaceId: string;
  authorId: string;
  authorEmail: string;
  isApproved?: boolean;
  status?: string;
}) {
  const slug = `post-${createId()}`;
  const post = await createPost({
    boardId: input.boardId,
    workspaceId: input.workspaceId,
    slug,
    title: `Post ${slug}`,
    body: "Test post body",
    authorId: input.authorId,
    authorName: "Test User",
    authorEmail: input.authorEmail,
    isApproved: input.isApproved ?? true,
  });

  if (input.status) {
    await db
      .update(posts)
      .set({ status: input.status })
      .where(eq(posts.id, post.id));
  }

  return post;
}

export async function createTestChangelogEntry(input: {
  workspaceId: string;
  createdBy: string;
  published?: boolean;
  postIds?: string[];
}) {
  const entry = await createChangelogEntry({
    workspaceId: input.workspaceId,
    createdBy: input.createdBy,
    title: `Changelog ${createId()}`,
    body: "Test changelog body",
    postIds: input.postIds ?? [],
  });

  if (input.published) {
    await publishChangelogEntry(entry.id, input.workspaceId);
  }

  return entry;
}
