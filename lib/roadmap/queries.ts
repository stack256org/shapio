import { and, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import { boards, categories, posts, votes } from "@/db/schema";
import { db } from "@/lib/db";

export const ROADMAP_STATUSES = [
  "planned",
  "in_progress",
  "completed",
] as const;
export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];

export interface RoadmapPost {
  boardId: string;
  boardName: string;
  boardSlug: string;
  categoryColor: string | null;
  categoryId: string | null;
  categoryName: string | null;
  commentCount: number;
  createdAt: Date;
  hasVoted: boolean;
  id: string;
  isPinned: boolean;
  slug: string;
  status: string;
  title: string;
  updatedAt: Date;
  upvotes: number;
}

export interface RoadmapData {
  completed: RoadmapPost[];
  in_progress: RoadmapPost[];
  planned: RoadmapPost[];
}

export type RoadmapSort = "votes" | "latest_status_change";

export async function listPostsForRoadmap(
  workspaceId: string,
  opts: {
    isAdmin?: boolean;
    userId?: string;
    search?: string;
    categoryId?: string;
    sort?: RoadmapSort;
  } = {}
): Promise<RoadmapData> {
  const { isAdmin = false, userId, search, categoryId, sort = "votes" } = opts;

  const conditions = [
    eq(posts.workspaceId, workspaceId),
    inArray(posts.status, [...ROADMAP_STATUSES]),
    // Merged posts leave active lists, including the roadmap.
    isNull(posts.mergedIntoId),
    // Unpublished drafts never appear on the roadmap (admin or public view).
    eq(posts.isDraft, false),
  ];

  // Public view excludes private/archived boards and posts hidden from the
  // public. "Hide from public" (the visibility toggle) sets isApproved = false,
  // the same flag every other public post query filters on — the roadmap must
  // honor it too. Admins still see hidden posts so they can manage them.
  if (!isAdmin) {
    conditions.push(eq(boards.isPublic, true));
    conditions.push(eq(posts.isApproved, true));
  }
  conditions.push(eq(boards.isArchived, false));

  if (categoryId) {
    conditions.push(eq(posts.categoryId, categoryId));
  }
  if (search?.trim()) {
    conditions.push(ilike(posts.title, `%${search.trim()}%`));
  }

  const orderByCols =
    sort === "latest_status_change"
      ? [desc(posts.isPinned), desc(posts.updatedAt)]
      : [desc(posts.isPinned), desc(posts.upvotes)];

  let rows: RoadmapPost[];

  if (userId) {
    const userVoteAlias = db
      .select({ postId: votes.postId, id: votes.id })
      .from(votes)
      .where(eq(votes.userId, userId))
      .as("user_vote");

    rows = await db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        status: posts.status,
        upvotes: posts.upvotes,
        commentCount: posts.commentCount,
        isPinned: posts.isPinned,
        hasVoted: sql<boolean>`${userVoteAlias.id} IS NOT NULL`,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        boardId: boards.id,
        boardSlug: boards.slug,
        boardName: boards.name,
        categoryId: posts.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(posts)
      .innerJoin(boards, eq(posts.boardId, boards.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .leftJoin(userVoteAlias, eq(posts.id, userVoteAlias.postId))
      .where(and(...conditions))
      .orderBy(...orderByCols);
  } else {
    rows = await db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        status: posts.status,
        upvotes: posts.upvotes,
        commentCount: posts.commentCount,
        isPinned: posts.isPinned,
        hasVoted: sql<boolean>`false`,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        boardId: boards.id,
        boardSlug: boards.slug,
        boardName: boards.name,
        categoryId: posts.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(posts)
      .innerJoin(boards, eq(posts.boardId, boards.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(...orderByCols);
  }

  return {
    planned: rows.filter((r) => r.status === "planned"),
    in_progress: rows.filter((r) => r.status === "in_progress"),
    completed: rows.filter((r) => r.status === "completed"),
  };
}

// ─── Generalized derived roadmap (Sync ON) ────────────────────────────────────
// Columns are driven by the workspace's own feedback statuses instead of the
// three fixed roadmap statuses, so a workspace that renames/adds statuses sees
// those columns on the roadmap. Feedback lands in the column matching its
// status slug. Used by the roadmap board when roadmapSyncEnabled is true.

export interface RoadmapStatusColumn {
  color: string;
  id: string;
  name: string;
  posts: RoadmapPost[];
  slug: string;
}

export async function listRoadmapByStatuses(
  workspaceId: string,
  statuses: { id: string; name: string; slug: string; color: string }[],
  opts: {
    isAdmin?: boolean;
    userId?: string;
    search?: string;
    categoryId?: string;
    sort?: RoadmapSort;
  } = {}
): Promise<RoadmapStatusColumn[]> {
  const { isAdmin = false, userId, search, categoryId, sort = "votes" } = opts;

  const statusSlugs = statuses.map((s) => s.slug);
  // No columns → nothing to fetch. Guard the empty inArray (invalid SQL).
  if (statusSlugs.length === 0) {
    return [];
  }

  const conditions = [
    eq(posts.workspaceId, workspaceId),
    inArray(posts.status, statusSlugs),
    isNull(posts.mergedIntoId),
    // A roadmap item exists only when its feedback is PUBLISHED. Drafts, and
    // spam/deleted/hidden posts (isApproved = false), never appear — in the
    // public OR the team view.
    eq(posts.isDraft, false),
    eq(posts.isApproved, true),
  ];

  // Only the public view additionally hides private boards; admins see roadmap
  // items on private boards too (board privacy ≠ post hidden/spam).
  if (!isAdmin) {
    conditions.push(eq(boards.isPublic, true));
  }
  conditions.push(eq(boards.isArchived, false));

  if (categoryId) {
    conditions.push(eq(posts.categoryId, categoryId));
  }
  if (search?.trim()) {
    conditions.push(ilike(posts.title, `%${search.trim()}%`));
  }

  const orderByCols =
    sort === "latest_status_change"
      ? [desc(posts.isPinned), desc(posts.updatedAt)]
      : [desc(posts.isPinned), desc(posts.upvotes)];

  const baseColumns = {
    id: posts.id,
    slug: posts.slug,
    title: posts.title,
    status: posts.status,
    upvotes: posts.upvotes,
    commentCount: posts.commentCount,
    isPinned: posts.isPinned,
    createdAt: posts.createdAt,
    updatedAt: posts.updatedAt,
    boardId: boards.id,
    boardSlug: boards.slug,
    boardName: boards.name,
    categoryId: posts.categoryId,
    categoryName: categories.name,
    categoryColor: categories.color,
  };

  let rows: RoadmapPost[];

  if (userId) {
    const userVoteAlias = db
      .select({ postId: votes.postId, id: votes.id })
      .from(votes)
      .where(eq(votes.userId, userId))
      .as("user_vote");

    rows = await db
      .select({
        ...baseColumns,
        hasVoted: sql<boolean>`${userVoteAlias.id} IS NOT NULL`,
      })
      .from(posts)
      .innerJoin(boards, eq(posts.boardId, boards.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .leftJoin(userVoteAlias, eq(posts.id, userVoteAlias.postId))
      .where(and(...conditions))
      .orderBy(...orderByCols);
  } else {
    rows = await db
      .select({ ...baseColumns, hasVoted: sql<boolean>`false` })
      .from(posts)
      .innerJoin(boards, eq(posts.boardId, boards.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(...orderByCols);
  }

  return statuses.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    color: s.color,
    posts: rows.filter((r) => r.status === s.slug),
  }));
}
