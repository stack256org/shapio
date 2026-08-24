import { createId } from "@paralleldrive/cuid2";
import { eq, sql } from "drizzle-orm";
import { comments, posts, votes } from "@/db/schema";
import { db } from "@/lib/db";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// The comment a merge posts on the target, summarizing what was merged in —
// mirrors the source post's own title/body so the target's thread keeps a
// readable record of it even though the source stays on its own page.
function buildMergeSummaryHtml(sourceTitle: string, sourceBody: string | null) {
  const header = `<p><strong>Merged Feedback:</strong> "${escapeHtml(sourceTitle)}"</p>`;
  if (!sourceBody?.trim()) {
    return header;
  }
  return `${header}<p><strong>Original content:</strong></p>${sourceBody}`;
}

// Snapshot of one source vote as it stood immediately before a merge —
// enough to reverse the merge later (see unmergePost in ./unmerge). Persisted
// as-is inside the "post.merged" audit log entry's `metadata.voteSnapshot`
// (no dedicated table: the audit log already captures who/when for a merge,
// this just rides along with it).
export interface MergeVoteSnapshotEntry {
  createdAt: string;
  id: string;
  userEmail: string | null;
  userId: string | null;
  userName: string | null;
  // true if this vote was deleted at merge time because its voter already had
  // a vote on the target (never physically moved); false if it was moved.
  wasDuplicate: boolean;
}

/**
 * Merge the source post into the target post:
 *  - votes transfer to the target (a voter who already voted on the target is
 *    de-duplicated, never double-counted),
 *  - both posts' denormalised vote counts are recomputed,
 *  - the source is locked and marked merged (it leaves active lists and points
 *    to the target),
 *  - a summary comment recapping the source's title/body is added to the
 *    target's thread, attributed to the source's original author.
 *
 * The source post's own comments stay put — it remains viewable with a
 * "merged into" notice. Both posts are assumed to belong to the same
 * workspace (enforced by the caller).
 *
 * Returns a snapshot of every source vote as it stood just before the merge —
 * the caller persists this (see mergePostAction) so unmergePost can restore
 * the source's original votes later.
 */
export async function mergePost(
  sourceId: string,
  targetId: string
): Promise<MergeVoteSnapshotEntry[]> {
  return db.transaction(async (tx) => {
    // 0. Snapshot the source's votes, and which of the target's voters they'd
    // collide with, BEFORE anything is deleted or moved. Also grab the
    // source's own content/author for the summary comment added in step 4.
    const [source, sourceVotes, targetVotes] = await Promise.all([
      tx
        .select({
          title: posts.title,
          body: posts.body,
          authorId: posts.authorId,
          authorEmail: posts.authorEmail,
          authorName: posts.authorName,
        })
        .from(posts)
        .where(eq(posts.id, sourceId))
        .limit(1)
        .then((r) => r[0]!),
      tx
        .select({
          id: votes.id,
          userId: votes.userId,
          userEmail: votes.userEmail,
          userName: votes.userName,
          createdAt: votes.createdAt,
        })
        .from(votes)
        .where(eq(votes.postId, sourceId)),
      tx
        .select({ userId: votes.userId, userEmail: votes.userEmail })
        .from(votes)
        .where(eq(votes.postId, targetId)),
    ]);
    const targetUserIds = new Set(
      targetVotes.map((v) => v.userId).filter((v): v is string => !!v)
    );
    const targetEmails = new Set(
      targetVotes.map((v) => v.userEmail).filter((v): v is string => !!v)
    );
    const voteSnapshot: MergeVoteSnapshotEntry[] = sourceVotes.map((v) => ({
      id: v.id,
      userId: v.userId,
      userEmail: v.userEmail,
      userName: v.userName,
      createdAt: v.createdAt.toISOString(),
      wasDuplicate:
        (!!v.userId && targetUserIds.has(v.userId)) ||
        (!!v.userEmail && targetEmails.has(v.userEmail)),
    }));

    // 1. Drop source votes that would duplicate an existing target vote.
    await tx.execute(sql`
      DELETE FROM votes AS s
      WHERE s.post_id = ${sourceId}
        AND EXISTS (
          SELECT 1 FROM votes t
          WHERE t.post_id = ${targetId}
            AND (
              (s.user_id IS NOT NULL AND t.user_id = s.user_id)
              OR (s.user_email IS NOT NULL AND t.user_email = s.user_email)
            )
        )
    `);

    // 2. Move the remaining source votes onto the target.
    await tx
      .update(votes)
      .set({ postId: targetId })
      .where(eq(votes.postId, sourceId));

    // 3. Recompute the denormalised vote counts for both posts.
    await tx.execute(sql`
      UPDATE posts
      SET upvotes = (SELECT COUNT(*) FROM votes WHERE votes.post_id = posts.id),
          updated_at = now()
      WHERE posts.id IN (${sourceId}, ${targetId})
    `);

    // 4. Add a summary comment to the target recapping the source's content,
    // attributed to the source's original author. Always approved — it's a
    // system-generated record of the merge, not user-submitted content
    // subject to moderation.
    await tx.insert(comments).values({
      id: createId(),
      postId: targetId,
      body: buildMergeSummaryHtml(source.title, source.body),
      isApproved: true,
      authorId: source.authorId,
      authorEmail: source.authorEmail,
      authorName: source.authorName,
      mergedFromPostId: sourceId,
    });
    await tx
      .update(posts)
      .set({ commentCount: sql`${posts.commentCount} + 1` })
      .where(eq(posts.id, targetId));

    // 5. Lock and mark the source as merged.
    await tx
      .update(posts)
      .set({ mergedIntoId: targetId, isLocked: true, updatedAt: new Date() })
      .where(eq(posts.id, sourceId));

    return voteSnapshot;
  });
}
