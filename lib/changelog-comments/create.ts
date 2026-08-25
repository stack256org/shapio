import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import {
  changelogComments,
  changelogEntries,
  user,
  workspaces,
} from "@/db/schema";
import { db } from "@/lib/db";
import { isBlocked } from "@/lib/moderation/queries";

export class ChangelogCommentBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChangelogCommentBlockedError";
  }
}

export class ChangelogCommentNotFoundError extends Error {
  constructor(message = "Changelog entry not found.") {
    super(message);
    this.name = "ChangelogCommentNotFoundError";
  }
}

export async function createChangelogComment(
  changelogEntryId: string,
  input: { body: string; authorId: string; parentId?: string | null },
  workspaceId: string,
  // Members may comment on unpublished (draft) entries from the admin side; the
  // public route never sets this, so drafts stay private there.
  opts: { allowUnpublished?: boolean } = {}
) {
  const entry = await db
    .select({
      id: changelogEntries.id,
      isPublished: changelogEntries.isPublished,
    })
    .from(changelogEntries)
    .where(eq(changelogEntries.id, changelogEntryId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!entry) {
    throw new ChangelogCommentNotFoundError();
  }
  if (!entry.isPublished && !opts.allowUnpublished) {
    throw new ChangelogCommentNotFoundError();
  }

  const blocked = await isBlocked(workspaceId, { userId: input.authorId });
  if (blocked) {
    throw new ChangelogCommentBlockedError(
      "You are not allowed to comment in this workspace."
    );
  }

  // Validate parent (one level of nesting only, same entry) — mirrors feedback.
  const parentId = input.parentId ?? null;
  if (parentId) {
    const parent = await db
      .select({
        id: changelogComments.id,
        parentId: changelogComments.parentId,
        changelogEntryId: changelogComments.changelogEntryId,
      })
      .from(changelogComments)
      .where(eq(changelogComments.id, parentId))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!parent) {
      throw new ChangelogCommentBlockedError("Parent comment not found.");
    }
    if (parent.parentId !== null) {
      throw new ChangelogCommentBlockedError(
        "Replies to replies are not allowed."
      );
    }
    if (parent.changelogEntryId !== changelogEntryId) {
      throw new ChangelogCommentBlockedError(
        "Parent comment does not belong to this entry."
      );
    }
  }

  // Comment moderation parity with feedback: when the workspace enables it, new
  // comments start unapproved and stay hidden until an admin approves them.
  const workspace = await db
    .select({ commentModeration: workspaces.commentModeration })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1)
    .then((r) => r[0] ?? null);
  const isApproved = !workspace?.commentModeration;

  const userRow = await db
    .select({ name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, input.authorId))
    .limit(1)
    .then((r) => r[0] ?? null);

  const id = createId();
  await db.insert(changelogComments).values({
    id,
    changelogEntryId,
    parentId,
    isApproved,
    body: input.body.trim(),
    authorId: input.authorId,
    authorName: userRow?.name ?? null,
    authorAvatar: userRow?.image ?? null,
  });

  return db
    .select()
    .from(changelogComments)
    .where(eq(changelogComments.id, id))
    .limit(1)
    .then((r) => r[0]!);
}
