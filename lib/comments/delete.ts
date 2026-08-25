import { eq, sql } from "drizzle-orm";
import { DELETED_COMMENT_BODY } from "@/config/platform";
import { comments, posts } from "@/db/schema";
import { db } from "@/lib/db";

export class CommentDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommentDeleteError";
  }
}

// `requesterId` is null for an accountless Public Portal visitor. Guest
// comments are final — a guest can delete nothing, including their own — so
// the authorship test below requires BOTH sides to be non-null. Without that,
// null === null would hold and every guest could delete every other guest's
// comment. Workspace members retain full moderation over guest comments.
export async function deleteComment(
  commentId: string,
  requesterId: string | null,
  requesterRole: string
): Promise<void> {
  const comment = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!comment) {
    throw new CommentDeleteError("Comment not found.");
  }

  // Any workspace member may remove a comment as clean-up (PLATFORM.md §4);
  // authors may always remove their own. Workspace membership is verified by the
  // caller (the DELETE route), so a non-empty role here means a workspace member.
  const isWorkspaceMember = requesterRole.length > 0;
  const isAuthor =
    !!requesterId && !!comment.authorId && comment.authorId === requesterId;

  if (!isWorkspaceMember && !isAuthor) {
    throw new CommentDeleteError(
      "You don't have permission to delete this comment."
    );
  }

  await db.transaction(async (tx) => {
    // Soft delete — keep the row (and its replies) as a "[deleted]" tombstone so
    // the thread structure is preserved (Feature 07). Author fields are cleared.
    await tx
      .update(comments)
      .set({
        isDeleted: true,
        body: DELETED_COMMENT_BODY,
        authorName: null,
        authorEmail: null,
        authorAvatar: null,
        updatedAt: new Date(),
      })
      .where(eq(comments.id, commentId));

    // Decrement comment_count only if it was approved and not already deleted
    if (comment.isApproved && !comment.isDeleted) {
      await tx
        .update(posts)
        .set({ commentCount: sql`GREATEST(${posts.commentCount} - 1, 0)` })
        .where(eq(posts.id, comment.postId));
    }
  });
}
