import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { categories, posts, roadmapItems } from "@/db/schema";
import { db } from "@/lib/db";
import { getRoadmapItems, type RoadmapItemRow } from "./items";
import { ensureRoadmapStatuses, type RoadmapStatusRow } from "./statuses";

export interface ManualRoadmapColumn {
  color: string;
  id: string;
  items: RoadmapItemRow[];
  name: string;
}

// Assemble the manual (Sync OFF) roadmap: workspace columns with their cards
// grouped in. Columns are seeded to sensible defaults if the workspace has none.
export async function getManualRoadmap(
  workspaceId: string
): Promise<{ columns: ManualRoadmapColumn[]; statuses: RoadmapStatusRow[] }> {
  const [statuses, items] = await Promise.all([
    ensureRoadmapStatuses(workspaceId),
    getRoadmapItems(workspaceId),
  ]);

  const columns = statuses.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    items: items.filter((i) => i.statusId === s.id),
  }));

  return { columns, statuses };
}

export interface FeedbackSearchResult {
  authorName: string | null;
  categoryColor: string | null;
  categoryName: string | null;
  commentCount: number;
  createdAt: Date;
  description: string | null;
  id: string;
  status: string;
  title: string;
  upvotes: number;
}

// Server-side feedback search for the "Fill from Feedback" panel. Matches on
// title, body (description), or category name (the closest thing to tags here),
// most-voted first, and pages via limit/offset. Admin scope: includes private
// boards and unapproved posts so the team can pull from anything.
export async function searchWorkspaceFeedback(
  workspaceId: string,
  opts: { query?: string; limit?: number; offset?: number } = {}
): Promise<{ results: FeedbackSearchResult[]; hasMore: boolean }> {
  const { query, limit = 20, offset = 0 } = opts;

  const conditions = [
    eq(posts.workspaceId, workspaceId),
    isNull(posts.mergedIntoId),
    eq(posts.isDraft, false),
  ];

  const q = query?.trim();
  if (q) {
    const like = `%${q}%`;
    const match = or(
      ilike(posts.title, like),
      ilike(posts.body, like),
      ilike(categories.name, like)
    );
    if (match) {
      conditions.push(match);
    }
  }

  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      description: posts.body,
      status: posts.status,
      upvotes: posts.upvotes,
      commentCount: posts.commentCount,
      authorName: posts.authorName,
      createdAt: posts.createdAt,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(posts.upvotes), desc(posts.createdAt))
    // Fetch one extra row to detect a next page without a second count query.
    .limit(limit + 1)
    .offset(offset);

  const hasMore = rows.length > limit;
  return { results: hasMore ? rows.slice(0, limit) : rows, hasMore };
}

// Snapshot of a single feedback post for a one-time "Fill from Feedback" import.
// Returns only what the import copies (title + description) plus provenance.
export async function getFeedbackForImport(
  workspaceId: string,
  postId: string
): Promise<{ id: string; title: string; description: string | null } | null> {
  const [row] = await db
    .select({ id: posts.id, title: posts.title, description: posts.body })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.workspaceId, workspaceId)))
    .limit(1);
  return row ?? null;
}

// Count only — used to render "N items" summaries without loading every card.
export async function countRoadmapItems(workspaceId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roadmapItems)
    .where(eq(roadmapItems.workspaceId, workspaceId));
  return row?.count ?? 0;
}
