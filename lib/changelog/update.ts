import { and, eq, inArray } from "drizzle-orm";
import { changelogEntries, changelogPosts, posts } from "@/db/schema";
import { isValidLabel } from "@/lib/changelog/constants";
import { db } from "@/lib/db";

export async function updateChangelogEntry(
  entryId: string,
  workspaceId: string,
  updates: {
    title?: string;
    body?: string;
    coverImageUrl?: string | null;
    label?: string;
    postIds?: string[];
  }
) {
  const [entry] = await db
    .select()
    .from(changelogEntries)
    .where(
      and(
        eq(changelogEntries.id, entryId),
        eq(changelogEntries.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!entry) {
    throw new Error("Changelog entry not found.");
  }

  if (updates.label !== undefined && !isValidLabel(updates.label)) {
    throw new Error("Invalid label.");
  }

  if (updates.postIds !== undefined && updates.postIds.length > 20) {
    throw new Error("Maximum 20 linked posts allowed.");
  }

  if (updates.postIds !== undefined && updates.postIds.length > 0) {
    const found = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          eq(posts.workspaceId, workspaceId),
          inArray(posts.id, updates.postIds)
        )
      );
    if (found.length !== updates.postIds.length) {
      throw new Error("One or more posts do not belong to this workspace.");
    }
  }

  await db.transaction(async (tx) => {
    const entryUpdates: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.title !== undefined) {
      entryUpdates.title = updates.title;
    }
    if (updates.body !== undefined) {
      entryUpdates.body = updates.body;
    }
    if (updates.coverImageUrl !== undefined) {
      entryUpdates.coverImageUrl = updates.coverImageUrl;
    }
    if (updates.label !== undefined) {
      entryUpdates.label = updates.label;
    }

    await tx
      .update(changelogEntries)
      .set(entryUpdates)
      .where(eq(changelogEntries.id, entryId));

    if (updates.postIds !== undefined) {
      await tx
        .delete(changelogPosts)
        .where(eq(changelogPosts.changelogEntryId, entryId));

      if (updates.postIds.length > 0) {
        await tx.insert(changelogPosts).values(
          updates.postIds.map((postId) => ({
            changelogEntryId: entryId,
            postId,
          }))
        );
      }
    }
  });

  const [updated] = await db
    .select()
    .from(changelogEntries)
    .where(eq(changelogEntries.id, entryId))
    .limit(1);

  return updated;
}
