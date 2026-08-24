import { and, eq, sql } from "drizzle-orm";
import { posts, votes } from "@/db/schema";
import { db } from "@/lib/db";
import type { VoteActor } from "@/lib/voting/cast";

export async function removeVote(
  postId: string,
  voter: Pick<VoteActor, "userEmail" | "userId">
): Promise<void> {
  const { userId, userEmail } = voter;
  if (!(userId || userEmail)) {
    return;
  }

  // Mirrors castVote's matching exactly, so a vote is always removable by the
  // same identity that could not re-cast it: userId for an account, the
  // verified email for a guest.
  const condition = userId
    ? and(eq(votes.postId, postId), eq(votes.userId, userId))
    : and(eq(votes.postId, postId), eq(votes.userEmail, userEmail));

  await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(votes)
      .where(condition)
      .returning({ id: votes.id });

    if (deleted) {
      await tx
        .update(posts)
        .set({ upvotes: sql`GREATEST(${posts.upvotes} - 1, 0)` })
        .where(eq(posts.id, postId));
    }
  });
}
