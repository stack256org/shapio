import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  boards,
  categories,
  posts,
  user,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { enqueueEmail } from "@/lib/email";
import { WorkspaceDeletedEmail } from "@/lib/email/components/workspace-deleted";
import { renderEmailTemplate } from "@/lib/email/renderer";

export interface OrbitWorkspaceRow {
  createdAt: Date;
  id: string;
  isSuspended: boolean;
  memberCount: number;
  name: string;
  ownerEmail: string | null;
  postCount: number;
  slug: string;
}

export async function listOrbitWorkspaces(opts: {
  page: number;
  limit?: number;
  search?: string;
  status?: "active" | "suspended";
}): Promise<{ workspaces: OrbitWorkspaceRow[]; total: number }> {
  const limit = opts.limit ?? 25;
  const offset = (opts.page - 1) * limit;

  const conditions = [];

  if (opts.search) {
    const term = `%${opts.search}%`;
    conditions.push(
      or(
        ilike(workspaces.name, term),
        ilike(workspaces.slug, term),
        ilike(user.email, term)
      )
    );
  }

  if (opts.status === "active") {
    conditions.push(eq(workspaces.isSuspended, false));
  } else if (opts.status === "suspended") {
    conditions.push(eq(workspaces.isSuspended, true));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        isSuspended: workspaces.isSuspended,
        createdAt: workspaces.createdAt,
        ownerEmail: user.email,
        postCount: sql<number>`(SELECT COUNT(*) FROM posts WHERE posts.workspace_id = ${workspaces.id})`,
        memberCount: sql<number>`(SELECT COUNT(*) FROM workspace_members WHERE workspace_members.workspace_id = ${workspaces.id})`,
      })
      .from(workspaces)
      .leftJoin(user, eq(workspaces.ownerId, user.id))
      .where(whereClause)
      .orderBy(desc(workspaces.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(workspaces)
      .leftJoin(user, eq(workspaces.ownerId, user.id))
      .where(whereClause),
  ]);

  return { workspaces: rows, total: totalRow.count };
}

export interface OrbitWorkspaceDetail {
  boards: Array<{ id: string; name: string; slug: string }>;
  categories: Array<{ id: string; name: string }>;
  createdAt: Date;
  description: string | null;
  id: string;
  isSuspended: boolean;
  memberCount: number;
  name: string;
  ownerEmail: string | null;
  ownerName: string | null;
  postCount: number;
  recentPosts: Array<{
    id: string;
    title: string;
    slug: string;
    createdAt: Date;
  }>;
  slug: string;
  suspendedAt: Date | null;
}

export async function getOrbitWorkspace(
  workspaceId: string
): Promise<OrbitWorkspaceDetail | null> {
  const [ws] = await db
    .select()
    .from(workspaces)
    .leftJoin(user, eq(workspaces.ownerId, user.id))
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!ws) {
    return null;
  }

  const [wsBoards, wsCategories, recentPosts, [memberRow], [postRow]] =
    await Promise.all([
      db
        .select({ id: boards.id, name: boards.name, slug: boards.slug })
        .from(boards)
        .where(eq(boards.workspaceId, workspaceId))
        .orderBy(boards.displayOrder),
      db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.workspaceId, workspaceId))
        .orderBy(categories.name),
      db
        .select({
          id: posts.id,
          title: posts.title,
          slug: posts.slug,
          createdAt: posts.createdAt,
        })
        .from(posts)
        .where(eq(posts.workspaceId, workspaceId))
        .orderBy(desc(posts.createdAt))
        .limit(10),
      db
        .select({ count: count() })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspaceId)),
      db
        .select({ count: count() })
        .from(posts)
        .where(eq(posts.workspaceId, workspaceId)),
    ]);

  return {
    id: ws.workspaces.id,
    name: ws.workspaces.name,
    slug: ws.workspaces.slug,
    description: ws.workspaces.description,
    isSuspended: ws.workspaces.isSuspended,
    suspendedAt: ws.workspaces.suspendedAt,
    createdAt: ws.workspaces.createdAt,
    ownerEmail: ws.user?.email ?? null,
    ownerName: ws.user?.name ?? null,
    boards: wsBoards,
    categories: wsCategories,
    recentPosts,
    memberCount: memberRow?.count ?? 0,
    postCount: postRow?.count ?? 0,
  };
}

export async function suspendWorkspace(
  workspaceId: string,
  suspendedByUserId: string,
  actorEmail: string
): Promise<void> {
  await db
    .update(workspaces)
    .set({
      isSuspended: true,
      suspendedAt: new Date(),
      suspendedBy: suspendedByUserId,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId));

  const [ws] = await db
    .select({ name: workspaces.name, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  await audit({
    action: "workspace.suspended",
    actorId: suspendedByUserId,
    actorEmail,
    description: `Workspace '${ws?.name ?? workspaceId}' suspended by admin`,
    entityId: workspaceId,
    entityName: ws?.name,
    entityType: "workspace",
    workspaceId,
  });
}

export async function unsuspendWorkspace(
  workspaceId: string,
  actorId: string,
  actorEmail: string
): Promise<void> {
  await db
    .update(workspaces)
    .set({
      isSuspended: false,
      suspendedAt: null,
      suspendedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId));

  const [ws] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  await audit({
    action: "workspace.unsuspended",
    actorId,
    actorEmail,
    description: `Workspace '${ws?.name ?? workspaceId}' unsuspended by admin`,
    entityId: workspaceId,
    entityName: ws?.name,
    entityType: "workspace",
    workspaceId,
  });
}

export async function deleteOrbitWorkspace(
  workspaceId: string,
  actorId: string,
  actorEmail: string
): Promise<void> {
  const [ws] = await db
    .select({ name: workspaces.name, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!ws) {
    throw new Error("Workspace not found");
  }

  // Collect member emails BEFORE deleting (the CASCADE removes membership rows).
  const recipients = await db
    .select({ email: user.email })
    .from(workspaceMembers)
    .innerJoin(user, eq(workspaceMembers.userId, user.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));

  // Notify every former member that the workspace was deleted (Feature 02).
  try {
    const html = await renderEmailTemplate(
      WorkspaceDeletedEmail({ workspaceName: ws.name })
    );
    const subject = `The workspace "${ws.name}" has been deleted`;
    for (const email of new Set(recipients.map((r) => r.email))) {
      await enqueueEmail({ to: email, subject, html });
    }
  } catch (err) {
    console.error("[orbit] failed to enqueue deletion emails", err);
  }

  await audit({
    action: "workspace.deleted_by_superadmin",
    actorId,
    actorEmail,
    description: `Workspace '${ws.name}' (${ws.slug}) deleted by admin`,
    entityId: workspaceId,
    entityName: ws.name,
    entityType: "workspace",
    workspaceId: null,
  });
}
