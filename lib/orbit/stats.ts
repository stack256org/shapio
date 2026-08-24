import { count, eq, gte, sql } from "drizzle-orm";
import { comments, posts, user, votes, workspaces } from "@/db/schema";
import { db } from "@/lib/db";

export interface PlatformStats {
  newUsersThisMonth: number;
  newWorkspacesThisMonth: number;
  suspendedWorkspaces: number;
  totalComments: number;
  totalPosts: number;
  totalUsers: number;
  totalVotes: number;
  totalWorkspaces: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    [totalWorkspacesRow],
    [suspendedWorkspacesRow],
    [totalUsersRow],
    [totalPostsRow],
    [totalVotesRow],
    [totalCommentsRow],
    [newWorkspacesRow],
    [newUsersRow],
  ] = await Promise.all([
    db.select({ count: count() }).from(workspaces),
    db
      .select({ count: count() })
      .from(workspaces)
      .where(eq(workspaces.isSuspended, true)),
    db.select({ count: count() }).from(user),
    db.select({ count: count() }).from(posts),
    db.select({ count: count() }).from(votes),
    db
      .select({ count: count() })
      .from(comments)
      .where(eq(comments.isDeleted, false)),
    db
      .select({ count: count() })
      .from(workspaces)
      .where(gte(workspaces.createdAt, startOfMonth)),
    db
      .select({ count: count() })
      .from(user)
      .where(gte(user.createdAt, startOfMonth)),
  ]);

  return {
    totalWorkspaces: totalWorkspacesRow.count,
    suspendedWorkspaces: suspendedWorkspacesRow.count,
    totalUsers: totalUsersRow.count,
    totalPosts: totalPostsRow.count,
    totalVotes: totalVotesRow.count,
    totalComments: totalCommentsRow.count,
    newWorkspacesThisMonth: newWorkspacesRow.count,
    newUsersThisMonth: newUsersRow.count,
  };
}

export interface RecentWorkspace {
  createdAt: Date;
  id: string;
  isSuspended: boolean;
  name: string;
  slug: string;
}

export async function getRecentWorkspaces(
  limit = 5
): Promise<RecentWorkspace[]> {
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      createdAt: workspaces.createdAt,
      isSuspended: workspaces.isSuspended,
    })
    .from(workspaces)
    .orderBy(sql`${workspaces.createdAt} DESC`)
    .limit(limit);
}

export interface RecentUser {
  createdAt: Date;
  email: string;
  id: string;
  name: string;
  role: string | null;
}

export async function getRecentUsers(limit = 5): Promise<RecentUser[]> {
  return db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(sql`${user.createdAt} DESC`)
    .limit(limit);
}
