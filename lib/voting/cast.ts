import { createId } from "@paralleldrive/cuid2";
import { and, eq, sql } from "drizzle-orm";
import { boards, posts, user, votes } from "@/db/schema";
import { db } from "@/lib/db";

export class VoteBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoteBlockedError";
  }
}

export class VoteNotFoundError extends Error {
  constructor() {
    super("Post not found.");
    this.name = "VoteNotFoundError";
  }
}

/**
 * Whoever is casting the vote. `userId` is null for an accountless Public
 * Portal visitor who has verified their email (lib/portal/guest-identity.ts) —
 * `userEmail` is then the whole identity, carried by the denormalized
 * userEmail/userName columns the schema has always had.
 */
export interface VoteActor {
  userEmail: string;
  userId: string | null;
  userName?: string | null;
}

export async function castVote(
  postId: string,
  workspaceId: string,
  voter: VoteActor
) {
  const { userId, userEmail } = voter;
  if (!(userId || userEmail)) {
    throw new Error("A userId or userEmail is required.");
  }

  // Pre-flight checks
  const post = await db
    .select({
      id: posts.id,
      boardId: posts.boardId,
    })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.workspaceId, workspaceId)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!post) {
    throw new VoteNotFoundError();
  }

  const board = await db
    .select({ isArchived: boards.isArchived })
    .from(boards)
    .where(eq(boards.id, post.boardId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (board?.isArchived) {
    throw new VoteBlockedError("This board is archived.");
  }

  // Already voted? An account matches on userId. A guest matches on the
  // verified email ALONE — deliberately not "email AND user_id IS NULL" — so
  // someone who voted while signed in cannot vote a second time by returning
  // as a guest with the same address.
  const existing = await db
    .select({ id: votes.id })
    .from(votes)
    .where(
      userId
        ? and(eq(votes.postId, postId), eq(votes.userId, userId))
        : and(eq(votes.postId, postId), eq(votes.userEmail, userEmail))
    )
    .limit(1)
    .then((r) => r[0] ?? null);

  if (existing) {
    return existing;
  }

  // For an account the live user row is authoritative for the denormalized
  // fallback columns. A guest has no row — their verified email and the name
  // they supplied are all there is.
  const userRecord = userId
    ? await db
        .select({ name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)
        .then((r) => r[0] ?? null)
    : null;

  return await db.transaction(async (tx) => {
    const [vote] = await tx
      .insert(votes)
      .values({
        id: createId(),
        postId,
        workspaceId,
        userId: userId ?? null,
        userEmail: userRecord?.email ?? userEmail,
        userName: userRecord?.name ?? voter.userName ?? null,
      })
      .onConflictDoNothing()
      .returning({ id: votes.id });

    if (vote) {
      await tx
        .update(posts)
        .set({ upvotes: sql`${posts.upvotes} + 1` })
        .where(eq(posts.id, postId));
    }

    return vote ?? existing;
  });
}
