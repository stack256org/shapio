import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray } from "drizzle-orm";
import { changelogEntries, changelogPosts, posts } from "@/db/schema";
import { isValidLabel } from "@/lib/changelog/constants";
import { db } from "@/lib/db";

export async function createChangelogEntry({
  workspaceId,
  createdBy,
  title,
  body = "",
  coverImageUrl = null,
  label = "new_feature",
  postIds = [],
}: {
  workspaceId: string;
  createdBy: string;
  title: string;
  body?: string;
  coverImageUrl?: string | null;
  label?: string;
  postIds?: string[];
}) {
  if (!isValidLabel(label)) {
    throw new Error("Invalid label.");
  }

  if (postIds.length > 20) {
    throw new Error("Maximum 20 linked posts allowed.");
  }

  if (postIds.length > 0) {
    const found = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(eq(posts.workspaceId, workspaceId), inArray(posts.id, postIds))
      );
    if (found.length !== postIds.length) {
      throw new Error("One or more posts do not belong to this workspace.");
    }
  }

  const id = createId();

  await db.transaction(async (tx) => {
    await tx.insert(changelogEntries).values({
      id,
      workspaceId,
      createdBy,
      title,
      body,
      coverImageUrl,
      label,
    });

    if (postIds.length > 0) {
      await tx
        .insert(changelogPosts)
        .values(postIds.map((postId) => ({ changelogEntryId: id, postId })));
    }
  });

  const [entry] = await db
    .select()
    .from(changelogEntries)
    .where(eq(changelogEntries.id, id))
    .limit(1);

  return entry;
}
