import { randomBytes } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, sql } from "drizzle-orm";
import {
  workspaceInviteLinks,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import { db } from "@/lib/db";

export interface CreateInviteLinkInput {
  createdById: string;
  expiresAt?: Date;
  label?: string;
  maxUses?: number;
  role: "member" | "admin";
  workspaceId: string;
}

export async function createInviteLink(
  input: CreateInviteLinkInput
): Promise<{ linkId: string; token: string }> {
  const token = randomBytes(32).toString("base64url");
  const linkId = createId();

  await db.insert(workspaceInviteLinks).values({
    id: linkId,
    workspaceId: input.workspaceId,
    createdById: input.createdById,
    role: input.role,
    token,
    label: input.label ?? null,
    maxUses: input.maxUses ?? null,
    expiresAt: input.expiresAt ?? null,
  });

  return { linkId, token };
}

export async function getInviteLinkByToken(token: string) {
  const [row] = await db
    .select({
      id: workspaceInviteLinks.id,
      workspaceId: workspaceInviteLinks.workspaceId,
      role: workspaceInviteLinks.role,
      label: workspaceInviteLinks.label,
      maxUses: workspaceInviteLinks.maxUses,
      useCount: workspaceInviteLinks.useCount,
      expiresAt: workspaceInviteLinks.expiresAt,
      isActive: workspaceInviteLinks.isActive,
      workspace: {
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        isSuspended: workspaces.isSuspended,
      },
    })
    .from(workspaceInviteLinks)
    .innerJoin(workspaces, eq(workspaceInviteLinks.workspaceId, workspaces.id))
    .where(eq(workspaceInviteLinks.token, token))
    .limit(1);
  return row ?? null;
}

/**
 * Is this link (as returned by getInviteLinkByToken) still usable to join —
 * active, unexpired, under its use cap, and the workspace not suspended?
 * Mirrors the row-level checks joinViaLink makes inside its transaction, so
 * a caller that only needs a yes/no (e.g. deciding whether an unknown email
 * may create an account) doesn't have to re-derive them.
 */
export function isInviteLinkLive(
  link: NonNullable<Awaited<ReturnType<typeof getInviteLinkByToken>>>
): boolean {
  if (!link.isActive) {
    return false;
  }
  if (link.expiresAt && link.expiresAt <= new Date()) {
    return false;
  }
  if (link.maxUses !== null && link.useCount >= link.maxUses) {
    return false;
  }
  return !link.workspace.isSuspended;
}

export async function hasLiveInviteLink(token: string): Promise<boolean> {
  const link = await getInviteLinkByToken(token);
  return !!link && isInviteLinkLive(link);
}

export async function getInviteLinkById(linkId: string, workspaceId: string) {
  const [row] = await db
    .select()
    .from(workspaceInviteLinks)
    .where(
      and(
        eq(workspaceInviteLinks.id, linkId),
        eq(workspaceInviteLinks.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export type JoinViaLinkResult =
  | { ok: true; workspaceId: string; workspaceSlug: string }
  | {
      ok: false;
      code:
        | "not_found"
        | "inactive"
        | "expired"
        | "max_uses_reached"
        | "already_member";
      workspaceSlug?: string;
    };

export async function joinViaLink(input: {
  token: string;
  userId: string;
}): Promise<JoinViaLinkResult> {
  return db.transaction(async (tx) => {
    const [link] = await tx
      .select()
      .from(workspaceInviteLinks)
      .where(eq(workspaceInviteLinks.token, input.token))
      .for("update")
      .limit(1);

    if (!link) {
      return { ok: false, code: "not_found" };
    }
    if (!link.isActive) {
      return { ok: false, code: "inactive" };
    }
    if (link.expiresAt && link.expiresAt <= new Date()) {
      return { ok: false, code: "expired" };
    }
    if (link.maxUses !== null && link.useCount >= link.maxUses) {
      return { ok: false, code: "max_uses_reached" };
    }

    const [workspace] = await tx
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        isSuspended: workspaces.isSuspended,
      })
      .from(workspaces)
      .where(eq(workspaces.id, link.workspaceId))
      .limit(1);

    if (!workspace || workspace.isSuspended) {
      return { ok: false, code: "not_found" };
    }

    const [existingMember] = await tx
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, link.workspaceId),
          eq(workspaceMembers.userId, input.userId)
        )
      )
      .limit(1);

    if (existingMember) {
      return {
        ok: false,
        code: "already_member",
        workspaceSlug: workspace.slug,
      };
    }

    await tx.insert(workspaceMembers).values({
      workspaceId: link.workspaceId,
      userId: input.userId,
      role: link.role,
    });

    await tx
      .update(workspaceInviteLinks)
      .set({
        useCount: sql`${workspaceInviteLinks.useCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(workspaceInviteLinks.id, link.id));

    return {
      ok: true,
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
    };
  });
}

export async function revokeInviteLink(linkId: string): Promise<void> {
  await db
    .update(workspaceInviteLinks)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(workspaceInviteLinks.id, linkId));
}

export async function listActiveInviteLinks(workspaceId: string) {
  return db
    .select({
      id: workspaceInviteLinks.id,
      role: workspaceInviteLinks.role,
      label: workspaceInviteLinks.label,
      maxUses: workspaceInviteLinks.maxUses,
      useCount: workspaceInviteLinks.useCount,
      expiresAt: workspaceInviteLinks.expiresAt,
      createdAt: workspaceInviteLinks.createdAt,
    })
    .from(workspaceInviteLinks)
    .where(
      and(
        eq(workspaceInviteLinks.workspaceId, workspaceId),
        eq(workspaceInviteLinks.isActive, true)
      )
    )
    .orderBy(workspaceInviteLinks.createdAt);
}
