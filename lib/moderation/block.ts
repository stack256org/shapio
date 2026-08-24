import { and, eq } from "drizzle-orm";
import { blockedUsers } from "@/db/schema";
import { user } from "@/db/schema/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";

export async function blockUser(
  workspaceId: string,
  blockedById: string,
  input: { email: string; reason?: string | null }
): Promise<typeof blockedUsers.$inferSelect> {
  // Look up user by email (may be a guest — no account)
  const [userRow] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1);

  const userId = userRow?.id ?? null;
  const userName = userRow?.name ?? input.email;

  const [row] = await db
    .insert(blockedUsers)
    .values({
      workspaceId,
      userId,
      userEmail: input.email,
      userName,
      blockedBy: blockedById,
      reason: input.reason ?? null,
    })
    .returning();

  audit({
    workspaceId,
    actorId: blockedById,
    action: "moderation.user_blocked",
    entityType: "workspace",
    entityId: workspaceId,
    description: `Blocked user ${input.email}`,
    metadata: { targetEmail: input.email, reason: input.reason ?? null },
  });

  return row!;
}

export async function unblockUser(
  blockedId: string,
  workspaceId: string,
  actorId: string
): Promise<void> {
  const [row] = await db
    .delete(blockedUsers)
    .where(
      and(
        eq(blockedUsers.id, blockedId),
        eq(blockedUsers.workspaceId, workspaceId)
      )
    )
    .returning();

  if (row) {
    audit({
      workspaceId,
      actorId,
      action: "moderation.user_unblocked",
      entityType: "workspace",
      entityId: workspaceId,
      description: `Unblocked user ${row.userEmail ?? row.userId}`,
      metadata: { targetEmail: row.userEmail ?? null },
    });
  }
}
