import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { ADMIN_ROLE, USER_ROLE } from "@/config/platform";
import {
  account,
  comments,
  posts,
  user,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";

export interface OrbitUserRow {
  banned: boolean;
  createdAt: Date;
  email: string;
  id: string;
  isAdmin: boolean;
  name: string;
  role: string | null;
  workspaceCount: number;
}

export async function listOrbitUsers(opts: {
  page: number;
  limit?: number;
  search?: string;
  adminsOnly?: boolean;
}): Promise<{ users: OrbitUserRow[]; total: number }> {
  const limit = opts.limit ?? 25;
  const offset = (opts.page - 1) * limit;

  const conditions = [];

  if (opts.search) {
    const term = `%${opts.search}%`;
    conditions.push(or(ilike(user.email, term), ilike(user.name, term)));
  }

  if (opts.adminsOnly) {
    conditions.push(eq(user.role, ADMIN_ROLE));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(user).where(whereClause),
  ]);

  const userIds = rows.map((r) => r.id);
  const memberCounts: Record<string, number> = {};

  if (userIds.length > 0) {
    const counts = await db
      .select({ userId: workspaceMembers.userId, count: count() })
      .from(workspaceMembers)
      .where(
        // count memberships for each user in the current page
        or(...userIds.map((id) => eq(workspaceMembers.userId, id)))
      )
      .groupBy(workspaceMembers.userId);

    for (const c of counts) {
      memberCounts[c.userId] = c.count;
    }
  }

  return {
    users: rows.map((r) => ({
      ...r,
      isAdmin: r.role === ADMIN_ROLE,
      workspaceCount: memberCounts[r.id] ?? 0,
    })),
    total: totalRow.count,
  };
}

export interface OrbitUserDetail {
  authMethods: string[];
  banned: boolean;
  banReason: string | null;
  createdAt: Date;
  email: string;
  id: string;
  isAdmin: boolean;
  name: string;
  recentComments: Array<{ id: string; body: string; createdAt: Date }>;
  recentPosts: Array<{
    id: string;
    title: string;
    slug: string;
    createdAt: Date;
  }>;
  role: string | null;
  updatedAt: Date;
  workspaceMemberships: Array<{
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string;
    role: string;
    joinedAt: Date;
  }>;
}

export async function getOrbitUser(
  userId: string
): Promise<OrbitUserDetail | null> {
  const [u] = await db.select().from(user).where(eq(user.id, userId)).limit(1);

  if (!u) {
    return null;
  }

  const [authMethods, memberships, recentPosts, recentComments] =
    await Promise.all([
      db
        .select({ providerId: account.providerId })
        .from(account)
        .where(eq(account.userId, userId)),
      db
        .select({
          workspaceId: workspaceMembers.workspaceId,
          workspaceName: workspaces.name,
          workspaceSlug: workspaces.slug,
          role: workspaceMembers.role,
          joinedAt: workspaceMembers.joinedAt,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(eq(workspaceMembers.userId, userId))
        .orderBy(workspaceMembers.joinedAt),
      db
        .select({
          id: posts.id,
          title: posts.title,
          slug: posts.slug,
          createdAt: posts.createdAt,
        })
        .from(posts)
        .where(eq(posts.authorId, userId))
        .orderBy(desc(posts.createdAt))
        .limit(5),
      db
        .select({
          id: comments.id,
          body: comments.body,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .where(
          and(eq(comments.authorId, userId), eq(comments.isDeleted, false))
        )
        .orderBy(desc(comments.createdAt))
        .limit(5),
    ]);

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    banned: u.banned,
    banReason: u.banReason,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    isAdmin: u.role === ADMIN_ROLE,
    authMethods: authMethods.map((a) => a.providerId),
    workspaceMemberships: memberships,
    recentPosts,
    recentComments,
  };
}

export async function grantAdmin(
  targetUserId: string,
  actorId: string,
  actorEmail: string
): Promise<void> {
  await db
    .update(user)
    .set({ role: ADMIN_ROLE, updatedAt: new Date() })
    .where(eq(user.id, targetUserId));

  const [target] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1);

  await audit({
    action: "superadmin.granted",
    actorId,
    actorEmail,
    description: `Admin access granted to ${target?.email ?? targetUserId}`,
    entityId: targetUserId,
    entityName: target?.email,
    entityType: "user",
    workspaceId: null,
  });
}

export async function revokeAdmin(
  targetUserId: string,
  actorId: string,
  actorEmail: string
): Promise<void> {
  if (targetUserId === actorId) {
    throw new Error("Cannot revoke your own admin access");
  }

  await db
    .update(user)
    .set({ role: USER_ROLE, updatedAt: new Date() })
    .where(eq(user.id, targetUserId));

  const [target] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1);

  await audit({
    action: "superadmin.revoked",
    actorId,
    actorEmail,
    description: `Admin access revoked from ${target?.email ?? targetUserId}`,
    entityId: targetUserId,
    entityName: target?.email,
    entityType: "user",
    workspaceId: null,
  });
}
