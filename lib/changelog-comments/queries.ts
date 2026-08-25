import { and, asc, count, eq, isNull } from "drizzle-orm";
import { changelogComments } from "@/db/schema";
import { db } from "@/lib/db";

export interface ChangelogCommentRow {
  authorAvatar: string | null;
  authorId: string | null;
  authorName: string | null;
  body: string;
  changelogEntryId: string;
  createdAt: Date;
  id: string;
  isApproved: boolean;
  isDeleted: boolean;
  parentId: string | null;
}

export interface ChangelogCommentWithReplies extends ChangelogCommentRow {
  replies: ChangelogCommentRow[];
}

const commentColumns = {
  id: changelogComments.id,
  changelogEntryId: changelogComments.changelogEntryId,
  parentId: changelogComments.parentId,
  body: changelogComments.body,
  isDeleted: changelogComments.isDeleted,
  isApproved: changelogComments.isApproved,
  authorId: changelogComments.authorId,
  authorName: changelogComments.authorName,
  authorAvatar: changelogComments.authorAvatar,
  createdAt: changelogComments.createdAt,
};

// Flat list (kept for existing callers). Ordered oldest → newest.
export async function listChangelogComments(changelogEntryId: string) {
  return db
    .select()
    .from(changelogComments)
    .where(eq(changelogComments.changelogEntryId, changelogEntryId))
    .orderBy(asc(changelogComments.createdAt));
}

// Threaded list mirroring lib/comments/queries.listComments — top-level comments
// each with their one level of replies. Unapproved rows are excluded unless the
// caller (an admin/moderator view) opts in.
export async function listChangelogCommentsWithReplies(
  changelogEntryId: string,
  opts: { includeUnapproved?: boolean } = {}
): Promise<ChangelogCommentWithReplies[]> {
  const { includeUnapproved = false } = opts;
  const approvalCondition = includeUnapproved
    ? undefined
    : eq(changelogComments.isApproved, true);

  const topLevelConditions = [
    eq(changelogComments.changelogEntryId, changelogEntryId),
    isNull(changelogComments.parentId),
  ];
  if (approvalCondition) {
    topLevelConditions.push(approvalCondition);
  }

  const topLevel = await db
    .select(commentColumns)
    .from(changelogComments)
    .where(and(...topLevelConditions))
    .orderBy(asc(changelogComments.createdAt));

  if (topLevel.length === 0) {
    return [];
  }

  const allRows = await db
    .select(commentColumns)
    .from(changelogComments)
    .where(
      and(
        eq(changelogComments.changelogEntryId, changelogEntryId),
        ...(approvalCondition ? [approvalCondition] : [])
      )
    )
    .orderBy(asc(changelogComments.createdAt));

  const repliesByParent = new Map<string, ChangelogCommentRow[]>();
  for (const row of allRows) {
    if (!row.parentId) {
      continue;
    }
    const arr = repliesByParent.get(row.parentId) ?? [];
    arr.push(row);
    repliesByParent.set(row.parentId, arr);
  }

  return topLevel.map((c) => ({
    ...c,
    replies: repliesByParent.get(c.id) ?? [],
  }));
}

// Mirrors lib/comments/queries.getOwnCommentIds for changelog comments —
// used by the embed personalization endpoint, which resolves identity from a
// bearer token instead of a cookie.
export async function getOwnChangelogCommentIds(
  changelogEntryId: string,
  userId: string
): Promise<Set<string>> {
  const rows = await db
    .select({ id: changelogComments.id })
    .from(changelogComments)
    .where(
      and(
        eq(changelogComments.changelogEntryId, changelogEntryId),
        eq(changelogComments.authorId, userId)
      )
    );

  return new Set(rows.map((r) => r.id));
}

export async function getChangelogCommentById(commentId: string) {
  const [row] = await db
    .select()
    .from(changelogComments)
    .where(eq(changelogComments.id, commentId))
    .limit(1);
  return row ?? null;
}

// Count of visible (approved, not deleted) comments + replies for an entry.
export async function getChangelogCommentCount(
  changelogEntryId: string
): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(changelogComments)
    .where(
      and(
        eq(changelogComments.changelogEntryId, changelogEntryId),
        eq(changelogComments.isApproved, true),
        eq(changelogComments.isDeleted, false)
      )
    );
  return value;
}
