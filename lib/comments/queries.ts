import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { comments, posts } from "@/db/schema";
import { db } from "@/lib/db";

export interface CommentRow {
  authorAvatar: string | null;
  authorId: string | null;
  authorName: string | null;
  body: string;
  createdAt: Date;
  id: string;
  isApproved: boolean;
  isDeleted: boolean;
  parentId: string | null;
  postId: string;
  updatedAt: Date;
}

export interface CommentWithReplies extends CommentRow {
  replies: CommentRow[];
}

export async function listComments(
  postId: string,
  opts: { includeUnapproved?: boolean } = {}
): Promise<CommentWithReplies[]> {
  const { includeUnapproved = false } = opts;

  const approvalCondition = includeUnapproved
    ? undefined
    : eq(comments.isApproved, true);

  const topLevelConditions = [
    eq(comments.postId, postId),
    isNull(comments.parentId),
  ];
  if (approvalCondition) {
    topLevelConditions.push(approvalCondition);
  }

  const topLevel = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      body: comments.body,
      isDeleted: comments.isDeleted,
      isApproved: comments.isApproved,
      authorId: comments.authorId,
      authorName: comments.authorName,
      authorAvatar: comments.authorAvatar,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
    })
    .from(comments)
    .where(and(...topLevelConditions))
    .orderBy(asc(comments.createdAt));

  if (topLevel.length === 0) {
    return [];
  }

  const replyConditions = [eq(comments.postId, postId)];
  if (approvalCondition) {
    replyConditions.push(approvalCondition);
  }

  const allReplies = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      body: comments.body,
      isDeleted: comments.isDeleted,
      isApproved: comments.isApproved,
      authorId: comments.authorId,
      authorName: comments.authorName,
      authorAvatar: comments.authorAvatar,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
    })
    .from(comments)
    .where(
      and(
        eq(comments.postId, postId),
        ...(approvalCondition ? [approvalCondition] : [])
      )
    )
    .orderBy(asc(comments.createdAt));

  const repliesByParent = new Map<string, CommentRow[]>();
  for (const reply of allReplies) {
    if (!reply.parentId) {
      continue;
    }
    const arr = repliesByParent.get(reply.parentId) ?? [];
    arr.push(reply);
    repliesByParent.set(reply.parentId, arr);
  }

  return topLevel.map((c) => ({
    ...c,
    replies: repliesByParent.get(c.id) ?? [],
  }));
}

export async function getCommentById(commentId: string) {
  const [row] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  return row ?? null;
}

// Batch ownership check across a set of posts — mirrors getBatchVotedSet's
// shape (lib/voting/list.ts) for the same "is this mine" purpose, just over
// comments/replies instead of votes. Used by the embed personalization
// endpoint, which resolves identity from a bearer token instead of a cookie.
export async function getOwnCommentIds(
  postIds: string[],
  userId: string
): Promise<Set<string>> {
  if (postIds.length === 0) {
    return new Set();
  }

  const rows = await db
    .select({ id: comments.id })
    .from(comments)
    .where(
      and(inArray(comments.postId, postIds), eq(comments.authorId, userId))
    );

  return new Set(rows.map((r) => r.id));
}

export interface PendingCommentRow {
  authorEmail: string | null;
  authorName: string | null;
  body: string;
  createdAt: Date;
  id: string;
  parentId: string | null;
  postId: string;
  postSlug: string;
  postTitle: string;
}

// Workspace-wide moderation queue — mirrors getPendingPosts (lib/posts/queries.ts)
// so admins have one place to review pending comments instead of relying on
// stumbling onto the inline queue on each post's own detail page.
export async function getPendingComments(
  workspaceId: string
): Promise<PendingCommentRow[]> {
  return db
    .select({
      id: comments.id,
      body: comments.body,
      parentId: comments.parentId,
      postId: comments.postId,
      authorName: comments.authorName,
      authorEmail: comments.authorEmail,
      createdAt: comments.createdAt,
      postTitle: posts.title,
      postSlug: posts.slug,
    })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .where(
      and(
        eq(posts.workspaceId, workspaceId),
        eq(comments.isApproved, false),
        eq(comments.isDeleted, false)
      )
    )
    .orderBy(desc(comments.createdAt));
}

export async function getCommentCount(postId: string): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(comments)
    .where(
      and(
        eq(comments.postId, postId),
        eq(comments.isApproved, true),
        eq(comments.isDeleted, false)
      )
    );
  return value;
}
