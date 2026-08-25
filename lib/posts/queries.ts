import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  notInArray,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { boards, postStatusChanges, posts, votes } from "@/db/schema";
import { db } from "@/lib/db";
import { POST_STATUSES, type PostStatus } from "@/lib/posts/constants";

export type { PostStatus };
export { POST_STATUSES };

// ─── Slug generation ──────────────────────────────────────────────────────────

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "post"
  );
}

export async function generatePostSlug(
  boardId: string,
  title: string
): Promise<string> {
  const base = slugify(title);

  const existing = await db
    .select({ slug: posts.slug })
    .from(posts)
    .where(
      and(eq(posts.boardId, boardId), sql`${posts.slug} LIKE ${base + "%"}`)
    );

  const taken = new Set(existing.map((r) => r.slug));
  if (!taken.has(base)) {
    return base;
  }

  let i = 2;
  while (taken.has(`${base}-${i}`)) {
    i++;
  }
  return `${base}-${i}`;
}

// ─── Read operations ──────────────────────────────────────────────────────────

export async function listBoardPosts(
  boardId: string,
  opts: {
    sort?: "newest" | "top" | "trending";
    status?: string;
    categoryId?: string;
    search?: string;
    userId?: string;
    // Verified email of an accountless Public Portal visitor, used only when
    // there is no `userId`. Without it their own votes would never light up
    // and every already-voted post would look un-voted to them.
    guestEmail?: string;
    myVotes?: boolean;
    onlyMine?: boolean;
    includeUnapproved?: boolean;
    excludeStatuses?: string[];
    limit?: number;
    offset?: number;
  } = {}
) {
  const {
    sort = "newest",
    status,
    categoryId,
    search,
    userId,
    guestEmail,
    myVotes,
    onlyMine,
    includeUnapproved = false,
    excludeStatuses,
    limit,
    offset = 0,
  } = opts;

  // An account is identified by id, a verified guest by email. Everything
  // vote-related below keys off whichever is present.
  const voterCondition = userId
    ? eq(votes.userId, userId)
    : guestEmail
      ? eq(votes.userEmail, guestEmail)
      : null;

  // Merged posts are hidden from active lists (Feature 05). Drafts are never
  // shown on the public board/portal — they live only in the admin feedback
  // view until published.
  const conditions = [
    eq(posts.boardId, boardId),
    isNull(posts.mergedIntoId),
    eq(posts.isDraft, false),
  ];

  // Moderation-held (unapproved) feedback is visible only to the team
  // (Brand Admins and Team Members); the public sees approved posts only
  // (Feature 05). Callers opt in to pending posts via `includeUnapproved`.
  if (!includeUnapproved) {
    conditions.push(eq(posts.isApproved, true));
  }

  // Statuses with showOnPublicFeed = false (e.g. Completed, by default) are
  // excluded from the public feed only — callers pass this in from the
  // workspace's status config; the admin panel never sets it.
  if (excludeStatuses && excludeStatuses.length > 0) {
    conditions.push(notInArray(posts.status, excludeStatuses));
  }

  if (status) {
    conditions.push(eq(posts.status, status));
  }

  if (categoryId) {
    conditions.push(eq(posts.categoryId, categoryId));
  }

  if (search?.trim()) {
    conditions.push(ilike(posts.title, `%${search.trim()}%`));
  }

  if (myVotes && voterCondition) {
    const votedPostIds = db
      .select({ id: votes.postId })
      .from(votes)
      .where(voterCondition);

    conditions.push(inArray(posts.id, votedPostIds));
  }

  if (onlyMine) {
    // A guest's posts carry a null authorId, so they are matched by the
    // verified author email instead.
    if (userId) {
      conditions.push(eq(posts.authorId, userId));
    } else if (guestEmail) {
      conditions.push(eq(posts.authorEmail, guestEmail));
    }
  }

  // Trending = most votes in the last 7 days (a correlated count), tie-broken
  // by all-time upvotes. Pinned posts always sort first.
  const recentVotes = sql`(
    select count(*) from ${votes}
    where ${votes.postId} = ${posts.id}
      and ${votes.createdAt} > now() - interval '7 days'
  )`;
  const orderByCols =
    sort === "top"
      ? [desc(posts.isPinned), desc(posts.upvotes)]
      : sort === "trending"
        ? [desc(posts.isPinned), desc(recentVotes), desc(posts.upvotes)]
        : [desc(posts.isPinned), desc(posts.createdAt)];

  if (voterCondition) {
    // LEFT JOIN to get hasVoted per post
    const userVoteAlias = db
      .select({ postId: votes.postId, id: votes.id })
      .from(votes)
      .where(voterCondition)
      .as("user_vote");

    const votedQuery = db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        body: posts.body,
        status: posts.status,
        categoryId: posts.categoryId,
        upvotes: posts.upvotes,
        commentCount: posts.commentCount,
        isPinned: posts.isPinned,
        authorName: posts.authorName,
        authorEmail: posts.authorEmail,
        createdAt: posts.createdAt,
        hasVoted: sql<boolean>`${userVoteAlias.id} IS NOT NULL`,
      })
      .from(posts)
      .leftJoin(userVoteAlias, eq(posts.id, userVoteAlias.postId))
      .where(and(...conditions))
      .orderBy(...orderByCols);
    return limit === undefined
      ? votedQuery
      : votedQuery.limit(limit).offset(offset);
  }

  const query = db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      body: posts.body,
      status: posts.status,
      categoryId: posts.categoryId,
      upvotes: posts.upvotes,
      commentCount: posts.commentCount,
      isPinned: posts.isPinned,
      authorName: posts.authorName,
      authorEmail: posts.authorEmail,
      createdAt: posts.createdAt,
      hasVoted: sql<boolean>`false`,
    })
    .from(posts)
    .where(and(...conditions))
    .orderBy(...orderByCols);
  return limit === undefined ? query : query.limit(limit).offset(offset);
}

export async function getPostBySlug(boardId: string, slug: string) {
  const [row] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.boardId, boardId), eq(posts.slug, slug)))
    .limit(1);
  return row ?? null;
}

export async function getPost(postId: string) {
  const [row] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  return row ?? null;
}

/** Posts merged INTO the given post — the reverse of `mergedIntoId`, for
 * showing merge history on the destination's detail page. */
export async function listPostsMergedInto(postId: string) {
  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      status: posts.status,
      upvotes: posts.upvotes,
      createdAt: posts.createdAt,
      boardSlug: boards.slug,
    })
    .from(posts)
    .innerJoin(boards, eq(posts.boardId, boards.id))
    .where(eq(posts.mergedIntoId, postId))
    .orderBy(desc(posts.createdAt));
}

export async function countBoardPosts(boardId: string): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(posts)
    .where(eq(posts.boardId, boardId));
  return value;
}

/** Count posts on a board under the same filters listBoardPosts uses — for pagination. */
export async function countBoardPostsFiltered(
  boardId: string,
  opts: {
    status?: string;
    categoryId?: string;
    search?: string;
    userId?: string;
    // See listBoardPosts — identifies an accountless verified visitor so the
    // "my votes" / "my posts" counts match the list they page through.
    guestEmail?: string;
    myVotes?: boolean;
    onlyMine?: boolean;
    includeUnapproved?: boolean;
    excludeStatuses?: string[];
  } = {}
): Promise<number> {
  const {
    status,
    categoryId,
    search,
    userId,
    guestEmail,
    myVotes,
    onlyMine,
    includeUnapproved = false,
    excludeStatuses,
  } = opts;

  const voterCondition = userId
    ? eq(votes.userId, userId)
    : guestEmail
      ? eq(votes.userEmail, guestEmail)
      : null;

  const conditions = [
    eq(posts.boardId, boardId),
    isNull(posts.mergedIntoId),
    eq(posts.isDraft, false),
  ];
  if (!includeUnapproved) {
    conditions.push(eq(posts.isApproved, true));
  }
  if (excludeStatuses && excludeStatuses.length > 0) {
    conditions.push(notInArray(posts.status, excludeStatuses));
  }
  if (status) {
    conditions.push(eq(posts.status, status));
  }
  if (categoryId) {
    conditions.push(eq(posts.categoryId, categoryId));
  }
  if (search?.trim()) {
    conditions.push(ilike(posts.title, `%${search.trim()}%`));
  }
  if (myVotes && voterCondition) {
    const votedPostIds = db
      .select({ id: votes.postId })
      .from(votes)
      .where(voterCondition);
    conditions.push(inArray(posts.id, votedPostIds));
  }
  if (onlyMine) {
    if (userId) {
      conditions.push(eq(posts.authorId, userId));
    } else if (guestEmail) {
      conditions.push(eq(posts.authorEmail, guestEmail));
    }
  }

  const [{ value }] = await db
    .select({ value: count() })
    .from(posts)
    .where(and(...conditions));
  return value;
}

export async function countWorkspacePosts(
  workspaceId: string
): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(posts)
    .where(eq(posts.workspaceId, workspaceId));
  return value;
}

/** Posts across every board in a workspace — the cross-board "All Feedback" view. */
export async function listWorkspacePosts(
  workspaceId: string,
  opts: {
    sort?: "newest" | "top";
    status?: string;
    categoryId?: string;
    boardId?: string;
    search?: string;
    userId?: string;
    authorId?: string;
    includeUnapproved?: boolean;
    // Draft visibility: "exclude" (default — never return drafts, safe for any
    // public/author surface), "include" (drafts + published, admin list view),
    // "only" (drafts only, admin Draft filter).
    drafts?: "exclude" | "include" | "only";
    // Merged posts are kept by default (unlike listBoardPosts, the public
    // board feed) — the author profile view still needs to show a user their
    // own merged item with a "Merged into" badge. The admin "All Feedback"
    // table opts out via excludeMerged: merge history now lives on the
    // destination post's detail page instead of cluttering the main list.
    excludeMerged?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const {
    sort = "newest",
    status,
    categoryId,
    boardId,
    search,
    userId,
    authorId,
    includeUnapproved = false,
    drafts = "exclude",
    excludeMerged = false,
    limit = 50,
    offset = 0,
  } = opts;

  const conditions = [eq(posts.workspaceId, workspaceId)];

  if (!includeUnapproved) {
    conditions.push(eq(posts.isApproved, true));
  }
  if (drafts === "exclude") {
    conditions.push(eq(posts.isDraft, false));
  } else if (drafts === "only") {
    conditions.push(eq(posts.isDraft, true));
  }
  if (excludeMerged) {
    conditions.push(isNull(posts.mergedIntoId));
  }
  if (status) {
    conditions.push(eq(posts.status, status));
  }
  if (categoryId) {
    conditions.push(eq(posts.categoryId, categoryId));
  }
  if (boardId) {
    conditions.push(eq(posts.boardId, boardId));
  }
  if (authorId) {
    conditions.push(eq(posts.authorId, authorId));
  }
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      // or() with 2+ args is always defined; the union type is only for the
      // zero-arg case, which can't happen here.
      or(ilike(posts.title, term), ilike(posts.authorName, term)) as SQL
    );
  }

  const orderByCols =
    sort === "top"
      ? [desc(posts.isPinned), desc(posts.upvotes)]
      : [desc(posts.isPinned), desc(posts.createdAt)];

  // Self-join to resolve the merge target's title/slug/board — enough for the
  // UI to render a "Merged into <title>" badge/link without a follow-up query
  // per row, in both the admin (id-based) and public profile (slug-based) routes.
  const mergeTarget = alias(posts, "merge_target");
  const mergeTargetBoard = alias(boards, "merge_target_board");

  const columns = {
    id: posts.id,
    slug: posts.slug,
    title: posts.title,
    body: posts.body,
    status: posts.status,
    categoryId: posts.categoryId,
    upvotes: posts.upvotes,
    commentCount: posts.commentCount,
    isPinned: posts.isPinned,
    isApproved: posts.isApproved,
    isDraft: posts.isDraft,
    authorName: posts.authorName,
    authorEmail: posts.authorEmail,
    createdAt: posts.createdAt,
    boardId: posts.boardId,
    boardSlug: boards.slug,
    boardName: boards.name,
    boardIsPublic: boards.isPublic,
    mergedIntoId: posts.mergedIntoId,
    mergedIntoTitle: mergeTarget.title,
    mergedIntoSlug: mergeTarget.slug,
    mergedIntoBoardSlug: mergeTargetBoard.slug,
    // Count of other posts merged into this one — lets the table surface a
    // "N merged" indicator on the parent row without a follow-up query per row.
    mergedCount: sql<number>`(
      SELECT COUNT(*)::int FROM posts AS merged_children
      WHERE merged_children.merged_into_id = ${posts.id}
    )`,
  };

  if (userId) {
    // LEFT JOIN to get hasVoted per post
    const userVoteAlias = db
      .select({ postId: votes.postId, id: votes.id })
      .from(votes)
      .where(eq(votes.userId, userId))
      .as("user_vote");

    return db
      .select({
        ...columns,
        hasVoted: sql<boolean>`${userVoteAlias.id} IS NOT NULL`,
      })
      .from(posts)
      .innerJoin(boards, eq(posts.boardId, boards.id))
      .leftJoin(userVoteAlias, eq(posts.id, userVoteAlias.postId))
      .leftJoin(mergeTarget, eq(posts.mergedIntoId, mergeTarget.id))
      .leftJoin(mergeTargetBoard, eq(mergeTarget.boardId, mergeTargetBoard.id))
      .where(and(...conditions))
      .orderBy(...orderByCols)
      .limit(limit)
      .offset(offset);
  }

  return db
    .select({ ...columns, hasVoted: sql<boolean>`false` })
    .from(posts)
    .innerJoin(boards, eq(posts.boardId, boards.id))
    .leftJoin(mergeTarget, eq(posts.mergedIntoId, mergeTarget.id))
    .leftJoin(mergeTargetBoard, eq(mergeTarget.boardId, mergeTargetBoard.id))
    .where(and(...conditions))
    .orderBy(...orderByCols)
    .limit(limit)
    .offset(offset);
}

export async function countWorkspacePostsFiltered(
  workspaceId: string,
  opts: {
    status?: string;
    categoryId?: string;
    boardId?: string;
    authorId?: string;
    search?: string;
    includeUnapproved?: boolean;
    drafts?: "exclude" | "include" | "only";
    excludeMerged?: boolean;
  } = {}
): Promise<number> {
  const {
    status,
    categoryId,
    boardId,
    authorId,
    search,
    includeUnapproved = false,
    drafts = "exclude",
    excludeMerged = false,
  } = opts;

  // Kept in lockstep with listWorkspacePosts so pagination matches what's
  // actually listed.
  const conditions = [eq(posts.workspaceId, workspaceId)];
  if (!includeUnapproved) {
    conditions.push(eq(posts.isApproved, true));
  }
  if (drafts === "exclude") {
    conditions.push(eq(posts.isDraft, false));
  } else if (drafts === "only") {
    conditions.push(eq(posts.isDraft, true));
  }
  if (excludeMerged) {
    conditions.push(isNull(posts.mergedIntoId));
  }
  if (status) {
    conditions.push(eq(posts.status, status));
  }
  if (categoryId) {
    conditions.push(eq(posts.categoryId, categoryId));
  }
  if (boardId) {
    conditions.push(eq(posts.boardId, boardId));
  }
  if (authorId) {
    conditions.push(eq(posts.authorId, authorId));
  }
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      // or() with 2+ args is always defined; the union type is only for the
      // zero-arg case, which can't happen here.
      or(ilike(posts.title, term), ilike(posts.authorName, term)) as SQL
    );
  }

  const [{ value }] = await db
    .select({ value: count() })
    .from(posts)
    .where(and(...conditions));
  return value;
}

export async function countWorkspacePostsByStatus(workspaceId: string) {
  const rows = await db
    .select({ status: posts.status, count: count() })
    .from(posts)
    .where(eq(posts.workspaceId, workspaceId))
    .groupBy(posts.status);

  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.status] = row.count;
  }
  return map;
}

// ─── Write operations ─────────────────────────────────────────────────────────

export async function createPost(input: {
  boardId: string;
  workspaceId: string;
  slug: string;
  title: string;
  body?: string | null;
  categoryId?: string | null;
  // Null for an accountless Public Portal visitor — the column has always been
  // nullable, and authorEmail (NOT NULL) is what attributes the post.
  authorId: string | null;
  authorName: string | null;
  authorEmail: string;
  imageUrl?: string | null;
  status?: string;
  isApproved?: boolean;
  isDraft?: boolean;
}) {
  const [post] = await db
    .insert(posts)
    .values({
      boardId: input.boardId,
      workspaceId: input.workspaceId,
      slug: input.slug,
      title: input.title.trim(),
      body: input.body ?? null,
      categoryId: input.categoryId ?? null,
      authorId: input.authorId,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
      imageUrl: input.imageUrl ?? null,
      ...(input.status ? { status: input.status } : {}),
      isApproved: input.isApproved ?? true,
      isDraft: input.isDraft ?? false,
    })
    .returning({
      id: posts.id,
      slug: posts.slug,
      isApproved: posts.isApproved,
      isDraft: posts.isDraft,
    });
  return post!;
}

export async function updatePost(
  postId: string,
  input: { title: string; body: string | null; imageUrl?: string | null }
) {
  await db
    .update(posts)
    .set({
      title: input.title.trim(),
      body: input.body,
      // Only touch the image when the caller passes it: undefined = leave as-is,
      // null = remove, string = replace.
      ...(input.imageUrl === undefined ? {} : { imageUrl: input.imageUrl }),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId));
}

export async function approvePost(postId: string): Promise<void> {
  await db
    .update(posts)
    .set({ isApproved: true, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}

export async function unapprovePost(postId: string): Promise<void> {
  await db
    .update(posts)
    .set({ isApproved: false, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}

/** Publish a draft: it becomes visible per its board/approval settings. */
export async function publishPost(postId: string): Promise<void> {
  await db
    .update(posts)
    .set({ isDraft: false, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}

/**
 * Revert a published post to a draft (the inverse of publishPost). Only the
 * isDraft publication flag flips — the post's status, votes, comments,
 * attachments, category, and history are all left untouched — so the same row
 * simply drops out of every public surface until it's published again.
 */
export async function unpublishPost(postId: string): Promise<void> {
  await db
    .update(posts)
    .set({ isDraft: true, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}

export async function getPendingPosts(workspaceId: string) {
  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      body: posts.body,
      boardId: posts.boardId,
      workspaceId: posts.workspaceId,
      authorId: posts.authorId,
      authorName: posts.authorName,
      authorEmail: posts.authorEmail,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(and(eq(posts.workspaceId, workspaceId), eq(posts.isApproved, false)))
    .orderBy(desc(posts.createdAt));
}

export async function updatePostStatus(postId: string, status: string) {
  await db
    .update(posts)
    .set({ status, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}

export async function updatePostCategory(
  postId: string,
  categoryId: string | null
) {
  await db
    .update(posts)
    .set({ categoryId, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}

export async function setPinned(postId: string, isPinned: boolean) {
  await db
    .update(posts)
    .set({ isPinned, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}

export async function assignPost(postId: string, assignedToId: string | null) {
  await db
    .update(posts)
    .set({ assignedToId, updatedAt: new Date() })
    .where(eq(posts.id, postId));
}

export async function deletePost(postId: string) {
  await db.delete(posts).where(eq(posts.id, postId));
}

// ─── Status history ─────────────────────────────────────────────────────────

export async function recordStatusChange(input: {
  postId: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  changedByName?: string | null;
  note?: string | null;
}): Promise<void> {
  await db.insert(postStatusChanges).values({
    postId: input.postId,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    changedBy: input.changedBy,
    changedByName: input.changedByName ?? null,
    note: input.note ?? null,
  });
}

export async function listStatusHistory(postId: string) {
  return db
    .select()
    .from(postStatusChanges)
    .where(eq(postStatusChanges.postId, postId))
    .orderBy(desc(postStatusChanges.createdAt));
}

// ─── Merge target search ──────────────────────────────────────────────────────

/**
 * Candidate posts to merge into: ANY post in the same workspace that isn't the
 * source and isn't already merged into something else. Visibility (approval /
 * draft state / board privacy) is intentionally NOT filtered here — a
 * moderation-held, draft, or private-board post is still a valid merge target,
 * since merging is an internal triage action. This is the ONLY place visibility
 * is relaxed; every public-facing query keeps its own visibility filters.
 */
export async function searchPostsForMerge(
  workspaceId: string,
  query: string,
  excludePostId: string
) {
  const conditions = [
    eq(posts.workspaceId, workspaceId),
    // Only merge-integrity guards remain: can't merge into an already-merged
    // post, and can't merge a post into itself.
    isNull(posts.mergedIntoId),
    sql`${posts.id} <> ${excludePostId}`,
  ];
  if (query.trim()) {
    conditions.push(ilike(posts.title, `%${query.trim()}%`));
  }
  return (
    db
      .select({
        id: posts.id,
        title: posts.title,
        upvotes: posts.upvotes,
        commentCount: posts.commentCount,
      })
      .from(posts)
      .where(and(...conditions))
      // Most-voted first (likeliest merge targets), capped so the picker never
      // loads the whole workspace — the client narrows it down with search.
      .orderBy(desc(posts.upvotes), desc(posts.createdAt))
      .limit(20)
  );
}

// "Similar posts while typing" (the embed widget's duplicate-detection
// nudge, shown as someone fills in a title). Unlike searchPostsForMerge —
// an internal triage action where visibility is intentionally relaxed —
// this surfaces results to an anonymous public visitor, so it keeps the
// same public-visibility rules as listBoardPosts: no drafts, no
// pending/unapproved posts, no already-merged posts.
export async function searchSimilarPosts(boardId: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      upvotes: posts.upvotes,
    })
    .from(posts)
    .where(
      and(
        eq(posts.boardId, boardId),
        isNull(posts.mergedIntoId),
        eq(posts.isDraft, false),
        eq(posts.isApproved, true),
        ilike(posts.title, `%${trimmed}%`)
      )
    )
    .orderBy(desc(posts.upvotes), desc(posts.createdAt))
    .limit(5);
}
