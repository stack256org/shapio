import { and, eq } from "drizzle-orm";
import { changelogEntries, changelogPosts, user, votes } from "@/db/schema";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/worker/enqueue";
import { JOB_NAMES } from "@/lib/worker/job-types";

export async function publishChangelogEntry(
  entryId: string,
  workspaceId: string
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

  if (entry.isPublished) {
    return entry;
  }

  const now = new Date();

  const [updated] = await db
    .update(changelogEntries)
    .set({
      isPublished: true,
      publishedAt: entry.publishedAt ?? now,
      updatedAt: now,
    })
    .where(eq(changelogEntries.id, entryId))
    .returning();

  // Only notify once per entry
  if (!entry.notifiedAt) {
    const linkedPostIds = await db
      .select({ postId: changelogPosts.postId })
      .from(changelogPosts)
      .where(eq(changelogPosts.changelogEntryId, entryId));

    let notificationsSent = 0;

    for (const { postId } of linkedPostIds) {
      // Signed-in voters don't store a denormalised email/name on their vote
      // (see castVote) — resolve it from their account so they still get notified.
      const voters = await db
        .select({
          userEmail: votes.userEmail,
          userId: votes.userId,
          userName: votes.userName,
          accountEmail: user.email,
          accountName: user.name,
        })
        .from(votes)
        .leftJoin(user, eq(votes.userId, user.id))
        .where(eq(votes.postId, postId));

      for (const voter of voters) {
        const email = voter.userEmail ?? voter.accountEmail;
        if (!email) {
          continue;
        }

        await enqueueJob(JOB_NAMES.SEND_CHANGELOG_EMAIL, {
          voterEmail: email,
          voterName: voter.userName ?? voter.accountName ?? email.split("@")[0],
          voterUserId: voter.userId ?? null,
          entryId,
          entryTitle: entry.title,
          entryLabel: entry.label,
          workspaceId,
        });
        notificationsSent++;
      }
    }

    if (notificationsSent > 0 || linkedPostIds.length === 0) {
      await db
        .update(changelogEntries)
        .set({ notifiedAt: new Date() })
        .where(eq(changelogEntries.id, entryId));
    } else if (linkedPostIds.length > 0) {
      await db
        .update(changelogEntries)
        .set({ notifiedAt: new Date() })
        .where(eq(changelogEntries.id, entryId));
    }
  }

  return updated;
}

export async function unpublishChangelogEntry(
  entryId: string,
  workspaceId: string
) {
  const [entry] = await db
    .select({
      id: changelogEntries.id,
      isPublished: changelogEntries.isPublished,
    })
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
  if (!entry.isPublished) {
    return entry;
  }

  const [updated] = await db
    .update(changelogEntries)
    .set({ isPublished: false, updatedAt: new Date() })
    .where(eq(changelogEntries.id, entryId))
    .returning();

  return updated;
}
