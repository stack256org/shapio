import { eq } from "drizzle-orm";
import { changelogComments } from "@/db/schema";
import { db } from "@/lib/db";

export class ChangelogCommentUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChangelogCommentUpdateError";
  }
}

// Edit a comment's body. Only the comment's own author may edit it — editing
// someone else's words is never allowed, not even for moderators. Deleted
// comments can't be edited. Mirrors lib/comments/update.ts.
export async function updateChangelogComment(
  commentId: string,
  requesterId: string,
  body: string
): Promise<void> {
  const comment = await db
    .select()
    .from(changelogComments)
    .where(eq(changelogComments.id, commentId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!comment) {
    throw new ChangelogCommentUpdateError("Comment not found.");
  }
  if (comment.isDeleted) {
    throw new ChangelogCommentUpdateError("This comment has been deleted.");
  }
  if (comment.authorId !== requesterId) {
    throw new ChangelogCommentUpdateError(
      "You can only edit your own comment."
    );
  }

  await db
    .update(changelogComments)
    .set({ body: body.trim() })
    .where(eq(changelogComments.id, commentId));
}
