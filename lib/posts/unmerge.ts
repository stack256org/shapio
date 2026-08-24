import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq, sql } from "drizzle-orm";
import { auditLogs, comments, posts, votes } from "@/db/schema";
import { db } from "@/lib/db";
import type { MergeVoteSnapshotEntry } from "./merge";

export class UnmergeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnmergeError";
  }
}

// Reverses a merge, restoring the source's pre-merge votes from the snapshot
// mergePost recorded in its "post.merged" audit entry:
//  - a snapshotted vote that was MOVED to the target gets moved back to the
//    source, unless it's since been removed there (respects a voter's later
//    choice rather than resurrecting a vote they explicitly took back);
//  - a snapshotted vote that was a DUPLICATE (deleted at merge time because
//    that voter already had a vote on the target) is recreated on the source,
//    unless the voter's target-side vote has since been removed too (same
//    reasoning — if they've un-voted since, don't bring either copy back).
// Votes cast on the source or target *after* the merge (both are independently
// votable once merged — see castVote) are untouched either way.
export async function unmergePost(sourceId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [source] = await tx
      .select()
      .from(posts)
      .where(eq(posts.id, sourceId))
      .limit(1);
    if (!source) {
      throw new UnmergeError("Post not found.");
    }
    if (!source.mergedIntoId) {
      throw new UnmergeError("This post is not merged.");
    }
    const targetId = source.mergedIntoId;

    const [auditRow] = await tx
      .select({ metadata: auditLogs.metadata })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityType, "post"),
          eq(auditLogs.action, "post.merged"),
          eq(auditLogs.entityId, sourceId)
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);

    const snapshot =
      (auditRow?.metadata?.voteSnapshot as
        | MergeVoteSnapshotEntry[]
        | undefined) ?? [];

    for (const entry of snapshot) {
      if (!entry.wasDuplicate) {
        // Moved vote — only exists to move back if it's still sitting on the
        // target under its original id (i.e. nobody has removed it since).
        await tx
          .update(votes)
          .set({ postId: sourceId })
          .where(and(eq(votes.id, entry.id), eq(votes.postId, targetId)));
        continue;
      }

      // Duplicate — deleted at merge time, so it can't be "moved back"; it
      // has to be recreated. Only do so if that same voter's copy is still
      // on the target right now.
      const voterCondition = entry.userId
        ? eq(votes.userId, entry.userId)
        : entry.userEmail
          ? eq(votes.userEmail, entry.userEmail)
          : null;
      if (!voterCondition) {
        continue;
      }
      const [stillOnTarget] = await tx
        .select({ id: votes.id })
        .from(votes)
        .where(and(eq(votes.postId, targetId), voterCondition))
        .limit(1);
      if (!stillOnTarget) {
        continue;
      }
      await tx
        .insert(votes)
        .values({
          id: createId(),
          postId: sourceId,
          workspaceId: source.workspaceId,
          userId: entry.userId,
          userEmail: entry.userEmail,
          userName: entry.userName,
        })
        .onConflictDoNothing();
    }

    // Recompute both posts' denormalised vote counts against the now-restored rows.
    await tx.execute(sql`
      UPDATE posts
      SET upvotes = (SELECT COUNT(*) FROM votes WHERE votes.post_id = posts.id),
          updated_at = now()
      WHERE posts.id IN (${sourceId}, ${targetId})
    `);

    await tx
      .update(posts)
      .set({ mergedIntoId: null, isLocked: false, updatedAt: new Date() })
      .where(eq(posts.id, sourceId));

    // Remove the summary comment mergePost added to the target, and its
    // count along with it — this reverses the merge, not just the votes.
    const removed = await tx
      .delete(comments)
      .where(
        and(
          eq(comments.postId, targetId),
          eq(comments.mergedFromPostId, sourceId)
        )
      )
      .returning({ id: comments.id, isApproved: comments.isApproved });

    const approvedRemoved = removed.filter((c) => c.isApproved).length;
    if (approvedRemoved > 0) {
      await tx
        .update(posts)
        .set({ commentCount: sql`${posts.commentCount} - ${approvedRemoved}` })
        .where(eq(posts.id, targetId));
    }
  });
}
