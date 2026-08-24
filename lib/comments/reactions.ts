import { and, eq, inArray, sql } from "drizzle-orm";
import { REACTION_EMOJIS } from "@/config/platform";
import { commentReactions, comments } from "@/db/schema";
import { user } from "@/db/schema/auth";
import { db } from "@/lib/db";

export type { ReactionEmoji } from "@/config/platform";
export { REACTION_EMOJIS } from "@/config/platform";

export interface ReactionGroup {
  count: number;
  emoji: string;
  hasReacted: boolean;
  reactorNames: string[];
}

export async function getReactionsForComments(
  commentIds: string[],
  userId?: string | null
): Promise<Map<string, ReactionGroup[]>> {
  if (commentIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      commentId: commentReactions.commentId,
      emoji: commentReactions.emoji,
      count: sql<number>`count(*)::int`,
      hasReacted: userId
        ? sql<boolean>`bool_or(${commentReactions.userId} = ${userId})`
        : sql<boolean>`false`,
      reactorNames: sql<
        string[]
      >`array_agg(${user.name}) filter (where ${user.name} is not null)`,
    })
    .from(commentReactions)
    .leftJoin(user, eq(commentReactions.userId, user.id))
    .where(inArray(commentReactions.commentId, commentIds))
    .groupBy(commentReactions.commentId, commentReactions.emoji);

  const map = new Map<string, ReactionGroup[]>();
  for (const row of rows) {
    const existing = map.get(row.commentId) ?? [];
    existing.push({
      emoji: row.emoji,
      count: row.count,
      hasReacted: row.hasReacted,
      reactorNames: row.reactorNames ?? [],
    });
    map.set(row.commentId, existing);
  }
  return map;
}

// Which emojis THIS user has reacted with, across every comment/reply on the
// given posts — used by the embed personalization endpoint (bearer identity
// instead of a cookie session) to correct `hasReacted` after mount, the same
// way getOwnCommentIds corrects `isOwn`. Scoped by postId (not a caller-
// supplied comment-id list) for the same reason: the page-level provider
// never enumerates comment ids itself — CommentSection fetches those.
export async function getOwnReactedEmojisForPosts(
  postIds: string[],
  userId: string
): Promise<Map<string, string[]>> {
  if (postIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      commentId: commentReactions.commentId,
      emoji: commentReactions.emoji,
    })
    .from(commentReactions)
    .innerJoin(comments, eq(commentReactions.commentId, comments.id))
    .where(
      and(
        inArray(comments.postId, postIds),
        eq(commentReactions.userId, userId)
      )
    );

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const arr = map.get(row.commentId) ?? [];
    arr.push(row.emoji);
    map.set(row.commentId, arr);
  }
  return map;
}

export async function toggleReaction(
  commentId: string,
  emoji: string,
  userId: string
): Promise<{ added: boolean }> {
  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    throw new Error("Invalid emoji.");
  }

  const existing = await db
    .select({ id: commentReactions.id })
    .from(commentReactions)
    .where(
      and(
        eq(commentReactions.commentId, commentId),
        eq(commentReactions.userId, userId),
        eq(commentReactions.emoji, emoji)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(commentReactions)
      .where(eq(commentReactions.id, existing[0]!.id));
    return { added: false };
  }

  const id = (await import("@paralleldrive/cuid2")).createId();
  await db.insert(commentReactions).values({ id, commentId, userId, emoji });
  return { added: true };
}
