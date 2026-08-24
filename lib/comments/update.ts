import { eq } from "drizzle-orm";
import { comments } from "@/db/schema";
import { db } from "@/lib/db";

export class CommentUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommentUpdateError";
  }
}

// Edit a comment's body. Only the comment's own author may edit it — unlike
// delete, editing someone else's words is never allowed, not even for
// moderators. Deleted comments can't be edited.
//
// Guest (accountless) comments are final and cannot be edited: their authorId
// is null, and `requesterId` is null for a guest, so a plain `!==` comparison
// would make null === null true and let ANY guest edit ANY other guest's
// comment. Both sides are therefore explicitly required to be non-null below.
export async function updateComment(
  commentId: string,
  requesterId: string | null,
  body: string
): Promise<void> {
  const comment = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!comment) {
    throw new CommentUpdateError("Comment not found.");
  }
  if (comment.isDeleted) {
    throw new CommentUpdateError("This comment has been deleted.");
  }
  if (!(requesterId && comment.authorId) || comment.authorId !== requesterId) {
    throw new CommentUpdateError("You can only edit your own comment.");
  }

  await db
    .update(comments)
    .set({ body: body.trim(), updatedAt: new Date() })
    .where(eq(comments.id, commentId));
}
