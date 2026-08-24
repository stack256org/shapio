import { and, count, desc, eq, ilike, sql } from "drizzle-orm";
import { cache } from "react";
import { changelogEntries, changelogPosts, posts, votes } from "@/db/schema";
import { CHANGELOG_LABEL_VALUES } from "@/lib/changelog/constants";
import { db } from "@/lib/db";

/** Distinct custom labels used across a workspace's entries (built-ins excluded). */
export async function getDistinctChangelogLabels(
  workspaceId: string
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ label: changelogEntries.label })
    .from(changelogEntries)
    .where(eq(changelogEntries.workspaceId, workspaceId));
  const builtins = new Set<string>(CHANGELOG_LABEL_VALUES);
  return rows
    .map((r) => r.label)
    .filter((l): l is string => !!l && !builtins.has(l))
    .sort();
}

export type ChangelogEntryRow = {
  id: string;
  workspaceId: string;
  title: string;
  body: string;
  coverImageUrl: string | null;
  label: string;
  isPublished: boolean;
  publishedAt: Date | null;
  notifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  linkedPostCount: number;
};

export type LinkedPost = {
  id: string;
  title: string;
  slug: string;
  status: string;
  upvotes: number;
  boardSlug: string;
  boardName: string;
  boardIsArchived: boolean;
  isLocked: boolean;
  hasVoted: boolean;
  // Resolved via a self-join so a linked-but-merged post can show a "Merged
  // into <title>" badge instead of just looking like any other locked post.
  mergedIntoBoardSlug: string | null;
  mergedIntoId: string | null;
  mergedIntoSlug: string | null;
  mergedIntoTitle: string | null;
};

export type ChangelogEntryWithPosts = ChangelogEntryRow & {
  linkedPosts: LinkedPost[];
};

export async function listChangelogEntries(
  workspaceId: string,
  opts: {
    includeDrafts?: boolean;
    page?: number;
    limit?: number;
    search?: string;
    label?: string;
  } = {}
): Promise<{ entries: ChangelogEntryRow[]; total: number; hasMore: boolean }> {
  const { includeDrafts = false, page = 1, limit = 20, search, label } = opts;
  const offset = (page - 1) * limit;

  const conditions = [eq(changelogEntries.workspaceId, workspaceId)];
  if (!includeDrafts) {
    conditions.push(eq(changelogEntries.isPublished, true));
  }
  if (label) {
    conditions.push(eq(changelogEntries.label, label));
  }
  if (search?.trim()) {
    conditions.push(ilike(changelogEntries.title, `%${search.trim()}%`));
  }

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select({
        id: changelogEntries.id,
        workspaceId: changelogEntries.workspaceId,
        title: changelogEntries.title,
        body: changelogEntries.body,
        coverImageUrl: changelogEntries.coverImageUrl,
        label: changelogEntries.label,
        isPublished: changelogEntries.isPublished,
        publishedAt: changelogEntries.publishedAt,
        notifiedAt: changelogEntries.notifiedAt,
        createdBy: changelogEntries.createdBy,
        createdAt: changelogEntries.createdAt,
        updatedAt: changelogEntries.updatedAt,
        linkedPostCount: sql<number>`(
          SELECT COUNT(*) FROM changelog_posts
          WHERE changelog_posts.changelog_entry_id = ${changelogEntries.id}
        )`,
      })
      .from(changelogEntries)
      .where(and(...conditions))
      .orderBy(
        desc(changelogEntries.isPublished),
        desc(changelogEntries.publishedAt),
        desc(changelogEntries.updatedAt)
      )
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(changelogEntries)
      .where(and(...conditions)),
  ]);

  return {
    entries: rows as ChangelogEntryRow[],
    total: Number(total),
    hasMore: offset + rows.length < Number(total),
  };
}

// cache(): changelog entry pages resolve the entry in both generateMetadata and
// the page body; dedupe to one query per render.
export const getChangelogEntryById = cache(
  async (
    entryId: string,
    workspaceId: string,
    opts: { publicOnly?: boolean; userId?: string | null } = {}
  ): Promise<ChangelogEntryWithPosts | null> => {
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
      return null;
    }

    const linkedPosts = await getLinkedPosts(entryId, opts);

    const linkedCount = linkedPosts.length;

    return {
      ...entry,
      linkedPostCount: linkedCount,
      linkedPosts,
    };
  }
);

export async function getLinkedPosts(
  entryId: string,
  opts: { publicOnly?: boolean; userId?: string | null } = {}
): Promise<LinkedPost[]> {
  const { boards } = await import("@/db/schema/boards");
  const { alias } = await import("drizzle-orm/pg-core");

  const conditions = [eq(changelogPosts.changelogEntryId, entryId)];
  // The public changelog entry page must never surface posts from private
  // boards or posts still pending moderation — the admin editor
  // (opts.publicOnly unset) still sees everything.
  if (opts.publicOnly) {
    conditions.push(
      eq(boards.isPublic, true),
      eq(posts.isApproved, true),
      eq(posts.isDraft, false)
    );
  }

  const mergeTarget = alias(posts, "changelog_merge_target");
  const mergeTargetBoard = alias(boards, "changelog_merge_target_board");

  const baseColumns = {
    id: posts.id,
    title: posts.title,
    slug: posts.slug,
    status: posts.status,
    upvotes: posts.upvotes,
    boardSlug: boards.slug,
    boardName: boards.name,
    boardIsArchived: boards.isArchived,
    isLocked: posts.isLocked,
    mergedIntoId: posts.mergedIntoId,
    mergedIntoTitle: mergeTarget.title,
    mergedIntoSlug: mergeTarget.slug,
    mergedIntoBoardSlug: mergeTargetBoard.slug,
  };

  if (opts.userId) {
    const userVoteAlias = db
      .select({ postId: votes.postId, id: votes.id })
      .from(votes)
      .where(eq(votes.userId, opts.userId))
      .as("user_vote");

    return db
      .select({
        ...baseColumns,
        hasVoted: sql<boolean>`${userVoteAlias.id} IS NOT NULL`,
      })
      .from(changelogPosts)
      .innerJoin(posts, eq(changelogPosts.postId, posts.id))
      .innerJoin(boards, eq(posts.boardId, boards.id))
      .leftJoin(userVoteAlias, eq(posts.id, userVoteAlias.postId))
      .leftJoin(mergeTarget, eq(posts.mergedIntoId, mergeTarget.id))
      .leftJoin(mergeTargetBoard, eq(mergeTarget.boardId, mergeTargetBoard.id))
      .where(and(...conditions));
  }

  return db
    .select({ ...baseColumns, hasVoted: sql<boolean>`false` })
    .from(changelogPosts)
    .innerJoin(posts, eq(changelogPosts.postId, posts.id))
    .innerJoin(boards, eq(posts.boardId, boards.id))
    .leftJoin(mergeTarget, eq(posts.mergedIntoId, mergeTarget.id))
    .leftJoin(mergeTargetBoard, eq(mergeTarget.boardId, mergeTargetBoard.id))
    .where(and(...conditions));
}

export async function searchWorkspacePosts(
  workspaceId: string,
  query: string,
  limit = 10
) {
  const { boards } = await import("@/db/schema/boards");
  const { alias } = await import("drizzle-orm/pg-core");

  const mergeTarget = alias(posts, "search_merge_target");

  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      status: posts.status,
      upvotes: posts.upvotes,
      boardSlug: boards.slug,
      boardName: boards.name,
      // Merging never blocks a post from being linked (an admin may want to
      // preserve the link even after the two feedback items were combined) —
      // surfaced here purely so the picker can flag it before they choose.
      mergedIntoId: posts.mergedIntoId,
      mergedIntoTitle: mergeTarget.title,
    })
    .from(posts)
    .innerJoin(boards, eq(posts.boardId, boards.id))
    .leftJoin(mergeTarget, eq(posts.mergedIntoId, mergeTarget.id))
    .where(
      and(
        eq(posts.workspaceId, workspaceId),
        query.trim() ? ilike(posts.title, `%${query.trim()}%`) : undefined
      )
    )
    .orderBy(desc(posts.upvotes))
    .limit(limit);
}
