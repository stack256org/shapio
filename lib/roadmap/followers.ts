import { and, eq } from "drizzle-orm";
import { roadmapFollowers } from "@/db/schema";
import { db } from "@/lib/db";

export async function isFollowingRoadmap(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: roadmapFollowers.id })
    .from(roadmapFollowers)
    .where(
      and(
        eq(roadmapFollowers.workspaceId, workspaceId),
        eq(roadmapFollowers.userId, userId)
      )
    )
    .limit(1);
  return !!row;
}

export async function followRoadmap(
  workspaceId: string,
  userId: string
): Promise<void> {
  await db
    .insert(roadmapFollowers)
    .values({ workspaceId, userId })
    .onConflictDoNothing({
      target: [roadmapFollowers.workspaceId, roadmapFollowers.userId],
    });
}

export async function unfollowRoadmap(
  workspaceId: string,
  userId: string
): Promise<void> {
  await db
    .delete(roadmapFollowers)
    .where(
      and(
        eq(roadmapFollowers.workspaceId, workspaceId),
        eq(roadmapFollowers.userId, userId)
      )
    );
}
