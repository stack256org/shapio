import { and, count, eq } from "drizzle-orm";
import { WORKSPACE_OWNER } from "@/config/platform";
import { workspaceMembers, workspaces } from "@/db/schema";
import { user } from "@/db/schema/auth";
import { db } from "@/lib/db";

export async function listMembers(workspaceId: string) {
  return db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
      user: {
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(workspaceMembers)
    .innerJoin(user, eq(workspaceMembers.userId, user.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(workspaceMembers.joinedAt);
}

export async function getMember(memberId: string, workspaceId: string) {
  const [row] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.id, memberId),
        eq(workspaceMembers.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function removeMember(memberId: string): Promise<void> {
  await db.delete(workspaceMembers).where(eq(workspaceMembers.id, memberId));
}

export async function changeRole(input: {
  memberId: string;
  role: "owner" | "admin" | "member";
}): Promise<void> {
  await db
    .update(workspaceMembers)
    .set({ role: input.role })
    .where(eq(workspaceMembers.id, input.memberId));
}

export async function getOwnerCount(workspaceId: string): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.role, WORKSPACE_OWNER)
      )
    );
  return value;
}

export async function getMemberCount(workspaceId: string): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  return value;
}

export async function transferOwnership(input: {
  workspaceId: string;
  actorMemberId: string;
  targetMemberId: string;
  targetUserId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(workspaceMembers)
      .set({ role: "owner" })
      .where(eq(workspaceMembers.id, input.targetMemberId));

    await tx
      .update(workspaceMembers)
      .set({ role: "admin" })
      .where(eq(workspaceMembers.id, input.actorMemberId));

    await tx
      .update(workspaces)
      .set({ ownerId: input.targetUserId })
      .where(eq(workspaces.id, input.workspaceId));
  });
}

export async function leaveWorkspace(input: {
  workspaceId: string;
  userId: string;
}): Promise<void> {
  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, input.workspaceId),
        eq(workspaceMembers.userId, input.userId)
      )
    );
}
