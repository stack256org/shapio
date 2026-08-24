import { eq } from "drizzle-orm";
import { DELETED_COMMENT_BODY } from "@/config/platform";
import { changelogComments } from "@/db/schema";
import { db } from "@/lib/db";

export class ChangelogCommentDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChangelogCommentDeleteError";
  }
}

export async function deleteChangelogComment(
  commentId: string,
  requesterId: string,
  requesterRole: string
): Promise<void> {
  const comment = await db
    .select()
    .from(changelogComments)
    .where(eq(changelogComments.id, commentId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!comment) {
    throw new ChangelogCommentDeleteError("Comment not found.");
  }

  // Any workspace member may remove a comment as clean-up; authors may always
  // remove their own. Workspace membership is verified by the caller (the
  // DELETE route), so a non-empty role here means a workspace member.
  const isWorkspaceMember = requesterRole.length > 0;
  const isAuthor = comment.authorId === requesterId;

  if (!isWorkspaceMember && !isAuthor) {
    throw new ChangelogCommentDeleteError(
      "You don't have permission to delete this comment."
    );
  }

  // Soft delete, matching the feedback-comments tombstone pattern.
  await db
    .update(changelogComments)
    .set({
      isDeleted: true,
      body: DELETED_COMMENT_BODY,
      authorName: null,
      authorAvatar: null,
    })
    .where(eq(changelogComments.id, commentId));
}
