import { and, asc, eq } from "drizzle-orm";
import { cache } from "react";
import { user, workspaceMembers, workspaces } from "@/db/schema";
import { db } from "@/lib/db";

// Wrapped in React cache(): generateMetadata and the page body both resolve the
// workspace by slug on every request; cache() dedupes that to one query per render.
export const getWorkspaceBySlug = cache(async (slug: string) => {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  return workspace ?? null;
});

export async function getWorkspaceOwnerName(ownerId: string | null) {
  if (!ownerId) {
    return null;
  }
  const [owner] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, ownerId))
    .limit(1);
  return owner?.name ?? null;
}

export async function getWorkspaceMember(workspaceId: string, userId: string) {
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);
  return member ?? null;
}

export async function getUserWorkspaces(userId: string) {
  return db
    .select({
      slug: workspaces.slug,
      name: workspaces.name,
      logoUrl: workspaces.logoUrl,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaces.isSuspended, false)
      )
    )
    .orderBy(asc(workspaces.name));
}

// Used by /setup to resume the first-run wizard's integrations step after an
// interrupted session (tab closed, sign-out) — the owner still has a
// workspace stuck mid-bootstrap, so route them back to finish it instead of
// /signin. See workspaces.requiresIntegrationSetup.
export async function getIncompleteBootstrapWorkspace(userId: string) {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(
      and(
        eq(workspaces.ownerId, userId),
        eq(workspaces.requiresIntegrationSetup, true)
      )
    )
    .limit(1);
  return workspace ?? null;
}

export async function getFirstUserWorkspace(userId: string) {
  const [row] = await db
    .select({
      slug: workspaces.slug,
      name: workspaces.name,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaces.isSuspended, false)
      )
    )
    .orderBy(asc(workspaceMembers.joinedAt))
    .limit(1);
  return row ?? null;
}
