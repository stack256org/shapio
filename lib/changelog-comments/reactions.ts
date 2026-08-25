import { and, eq, inArray, sql } from "drizzle-orm";
import { REACTION_EMOJIS } from "@/config/platform";
import {
  changelogCommentReactions,
  changelogComments,
  changelogEntryReactions,
} from "@/db/schema";
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

export async function getReactionsForEntry(
  changelogEntryId: string,
  userId?: string | null
): Promise<ReactionGroup[]> {
  const rows = await db
    .select({
      emoji: changelogEntryReactions.emoji,
      count: sql<number>`count(*)::int`,
      hasReacted: userId
        ? sql<boolean>`bool_or(${changelogEntryReactions.userId} = ${userId})`
        : sql<boolean>`false`,
      reactorNames: sql<
        string[]
      >`array_agg(${user.name}) filter (where ${user.name} is not null)`,
    })
    .from(changelogEntryReactions)
    .leftJoin(user, eq(changelogEntryReactions.userId, user.id))
    .where(eq(changelogEntryReactions.changelogEntryId, changelogEntryId))
    .groupBy(changelogEntryReactions.emoji);

  return rows.map((row) => ({
    emoji: row.emoji,
    count: row.count,
    hasReacted: row.hasReacted,
    reactorNames: row.reactorNames ?? [],
  }));
}

/** Batched version of getReactionsForEntry for a list of entries (e.g. the
 * public changelog index) — one grouped query instead of one per entry. */
export async function getReactionsForEntries(
  changelogEntryIds: string[],
  userId?: string | null
): Promise<Map<string, ReactionGroup[]>> {
  if (changelogEntryIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      changelogEntryId: changelogEntryReactions.changelogEntryId,
      emoji: changelogEntryReactions.emoji,
      count: sql<number>`count(*)::int`,
      hasReacted: userId
        ? sql<boolean>`bool_or(${changelogEntryReactions.userId} = ${userId})`
        : sql<boolean>`false`,
      reactorNames: sql<
        string[]
      >`array_agg(${user.name}) filter (where ${user.name} is not null)`,
    })
    .from(changelogEntryReactions)
    .leftJoin(user, eq(changelogEntryReactions.userId, user.id))
    .where(inArray(changelogEntryReactions.changelogEntryId, changelogEntryIds))
    .groupBy(
      changelogEntryReactions.changelogEntryId,
      changelogEntryReactions.emoji
    );

  const grouped = new Map<string, ReactionGroup[]>();
  for (const row of rows) {
    const list = grouped.get(row.changelogEntryId) ?? [];
    list.push({
      emoji: row.emoji,
      count: row.count,
      hasReacted: row.hasReacted,
      reactorNames: row.reactorNames ?? [],
    });
    grouped.set(row.changelogEntryId, list);
  }
  return grouped;
}

// Which emojis THIS user has reacted with on the entry itself — mirrors
// lib/comments/reactions.getOwnReactedEmojisForPosts, used by the embed
// personalization endpoint to correct `hasReacted` after mount.
export async function getOwnReactedEntryEmojis(
  changelogEntryId: string,
  userId: string
): Promise<string[]> {
  const rows = await db
    .select({ emoji: changelogEntryReactions.emoji })
    .from(changelogEntryReactions)
    .where(
      and(
        eq(changelogEntryReactions.changelogEntryId, changelogEntryId),
        eq(changelogEntryReactions.userId, userId)
      )
    );

  return rows.map((r) => r.emoji);
}

// Batched version of getOwnReactedEntryEmojis for a list of entries (e.g.
// the public changelog index, which renders one ChangelogReactions per
// entry) — mirrors getReactionsForEntries' batching for the same reason.
export async function getOwnReactedEntryEmojisBatch(
  changelogEntryIds: string[],
  userId: string
): Promise<Map<string, string[]>> {
  if (changelogEntryIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      changelogEntryId: changelogEntryReactions.changelogEntryId,
      emoji: changelogEntryReactions.emoji,
    })
    .from(changelogEntryReactions)
    .where(
      and(
        inArray(changelogEntryReactions.changelogEntryId, changelogEntryIds),
        eq(changelogEntryReactions.userId, userId)
      )
    );

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const arr = map.get(row.changelogEntryId) ?? [];
    arr.push(row.emoji);
    map.set(row.changelogEntryId, arr);
  }
  return map;
}

export async function toggleEntryReaction(
  changelogEntryId: string,
  emoji: string,
  userId: string
): Promise<{ added: boolean }> {
  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    throw new Error("Invalid emoji.");
  }

  const existing = await db
    .select({ id: changelogEntryReactions.id })
    .from(changelogEntryReactions)
    .where(
      and(
        eq(changelogEntryReactions.changelogEntryId, changelogEntryId),
        eq(changelogEntryReactions.userId, userId),
        eq(changelogEntryReactions.emoji, emoji)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(changelogEntryReactions)
      .where(eq(changelogEntryReactions.id, existing[0]!.id));
    return { added: false };
  }

  const id = (await import("@paralleldrive/cuid2")).createId();
  await db
    .insert(changelogEntryReactions)
    .values({ id, changelogEntryId, userId, emoji });
  return { added: true };
}

// ─── Per-comment reactions ────────────────────────────────────────────────────
// Mirrors lib/comments/reactions.ts so the shared reactions UI works on
// changelog comments exactly as it does on feedback comments.

export async function getReactionsForChangelogComments(
  commentIds: string[],
  userId?: string | null
): Promise<Map<string, ReactionGroup[]>> {
  if (commentIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      commentId: changelogCommentReactions.commentId,
      emoji: changelogCommentReactions.emoji,
      count: sql<number>`count(*)::int`,
      hasReacted: userId
        ? sql<boolean>`bool_or(${changelogCommentReactions.userId} = ${userId})`
        : sql<boolean>`false`,
      reactorNames: sql<
        string[]
      >`array_agg(${user.name}) filter (where ${user.name} is not null)`,
    })
    .from(changelogCommentReactions)
    .leftJoin(user, eq(changelogCommentReactions.userId, user.id))
    .where(inArray(changelogCommentReactions.commentId, commentIds))
    .groupBy(
      changelogCommentReactions.commentId,
      changelogCommentReactions.emoji
    );

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

// Mirrors getOwnReactedEmojisForPosts (lib/comments/reactions.ts) for
// changelog comments — scoped by changelogEntryId (the page-level provider's
// existing trigger for changelog comment ownership) via a join, rather than
// a caller-supplied comment-id list.
export async function getOwnReactedEmojisForChangelogEntry(
  changelogEntryId: string,
  userId: string
): Promise<Map<string, string[]>> {
  const rows = await db
    .select({
      commentId: changelogCommentReactions.commentId,
      emoji: changelogCommentReactions.emoji,
    })
    .from(changelogCommentReactions)
    .innerJoin(
      changelogComments,
      eq(changelogCommentReactions.commentId, changelogComments.id)
    )
    .where(
      and(
        eq(changelogComments.changelogEntryId, changelogEntryId),
        eq(changelogCommentReactions.userId, userId)
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

export async function toggleChangelogCommentReaction(
  commentId: string,
  emoji: string,
  userId: string
): Promise<{ added: boolean }> {
  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    throw new Error("Invalid emoji.");
  }

  const existing = await db
    .select({ id: changelogCommentReactions.id })
    .from(changelogCommentReactions)
    .where(
      and(
        eq(changelogCommentReactions.commentId, commentId),
        eq(changelogCommentReactions.userId, userId),
        eq(changelogCommentReactions.emoji, emoji)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(changelogCommentReactions)
      .where(eq(changelogCommentReactions.id, existing[0]!.id));
    return { added: false };
  }

  const id = (await import("@paralleldrive/cuid2")).createId();
  await db
    .insert(changelogCommentReactions)
    .values({ id, commentId, userId, emoji });
  return { added: true };
}
