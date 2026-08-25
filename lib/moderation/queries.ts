import { and, desc, eq, or } from "drizzle-orm";
import { blockedUsers } from "@/db/schema";
import { user } from "@/db/schema/auth";
import { db } from "@/lib/db";

export async function isBlocked(
  workspaceId: string,
  opts: { userId?: string | null; userEmail?: string | null }
): Promise<boolean> {
  const conditions = [eq(blockedUsers.workspaceId, workspaceId)];

  const matchConditions = [];
  if (opts.userId) {
    matchConditions.push(eq(blockedUsers.userId, opts.userId));
  }
  if (opts.userEmail) {
    matchConditions.push(eq(blockedUsers.userEmail, opts.userEmail));
  }

  if (matchConditions.length === 0) {
    return false;
  }

  conditions.push(or(...matchConditions)!);

  const [row] = await db
    .select({ id: blockedUsers.id })
    .from(blockedUsers)
    .where(and(...conditions))
    .limit(1);

  return !!row;
}

export async function listBlockedUsers(workspaceId: string) {
  return db
    .select({
      id: blockedUsers.id,
      userId: blockedUsers.userId,
      userEmail: blockedUsers.userEmail,
      userName: blockedUsers.userName,
      reason: blockedUsers.reason,
      createdAt: blockedUsers.createdAt,
      blockedBy: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(blockedUsers)
    .leftJoin(user, eq(blockedUsers.blockedBy, user.id))
    .where(eq(blockedUsers.workspaceId, workspaceId))
    .orderBy(desc(blockedUsers.createdAt));
}

export type BlockedUserRow = Awaited<
  ReturnType<typeof listBlockedUsers>
>[number];
