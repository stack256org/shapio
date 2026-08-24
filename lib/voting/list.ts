import { and, count, desc, eq, inArray } from "drizzle-orm";
import { user, votes } from "@/db/schema";
import { db } from "@/lib/db";

export interface Voter {
  email: string | null;
  id: string;
  image: string | null;
  isGuest: boolean;
  name: string | null;
  votedAt: Date;
}

export async function listVoters(
  postId: string,
  opts: { page?: number; limit?: number } = {}
): Promise<{ voters: Voter[]; total: number }> {
  const { page = 1, limit = 50 } = opts;
  const offset = (page - 1) * limit;

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select({
        id: votes.id,
        userId: votes.userId,
        userEmail: votes.userEmail,
        userName: votes.userName,
        createdAt: votes.createdAt,
        // User fields (null for guests)
        userDisplayName: user.name,
        userDisplayEmail: user.email,
        userImage: user.image,
      })
      .from(votes)
      .leftJoin(user, eq(votes.userId, user.id))
      .where(eq(votes.postId, postId))
      .orderBy(desc(votes.createdAt))
      .limit(limit)
      .offset(offset),

    db.select({ value: count() }).from(votes).where(eq(votes.postId, postId)),
  ]);

  const voters: Voter[] = rows.map((r) => ({
    id: r.id,
    name: r.userDisplayName ?? r.userName ?? null,
    email: r.userDisplayEmail ?? r.userEmail ?? null,
    image: r.userImage ?? null,
    votedAt: r.createdAt,
    isGuest: !r.userId,
  }));

  return { voters, total };
}

export async function getVotedPostIds(
  workspaceId: string,
  voter: { userId?: string; userEmail?: string }
): Promise<string[]> {
  const { userId, userEmail } = voter;
  if (!userId && !userEmail) {
    return [];
  }

  const condition = userId
    ? and(eq(votes.workspaceId, workspaceId), eq(votes.userId, userId))
    : and(eq(votes.workspaceId, workspaceId), eq(votes.userEmail, userEmail!));

  const rows = await db
    .select({ postId: votes.postId })
    .from(votes)
    .where(condition);

  return rows.map((r) => r.postId);
}

export async function hasUserVoted(
  postId: string,
  voter: { userId?: string; userEmail?: string }
): Promise<boolean> {
  const { userId, userEmail } = voter;
  if (!userId && !userEmail) {
    return false;
  }

  const condition = userId
    ? and(eq(votes.postId, postId), eq(votes.userId, userId))
    : and(eq(votes.postId, postId), eq(votes.userEmail, userEmail!));

  const [row] = await db
    .select({ id: votes.id })
    .from(votes)
    .where(condition)
    .limit(1);

  return !!row;
}

export async function getBatchVotedSet(
  postIds: string[],
  userId: string
): Promise<Set<string>> {
  if (postIds.length === 0) {
    return new Set();
  }

  const rows = await db
    .select({ postId: votes.postId })
    .from(votes)
    .where(and(eq(votes.userId, userId), inArray(votes.postId, postIds)));

  return new Set(rows.map((r) => r.postId));
}
