import type { NotificationType } from "@/db/schema/notifications";
import { notifications } from "@/db/schema/notifications";
import { db } from "@/lib/db";

export interface CreateNotificationInput {
  body?: string;
  link: string;
  title: string;
  type: NotificationType;
  userId: string;
  workspaceId: string;
}

export async function createNotification(input: CreateNotificationInput) {
  if (!input.userId || !input.workspaceId) {
    return null;
  }

  try {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: input.userId,
        workspaceId: input.workspaceId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link,
      })
      .returning();
    return notification ?? null;
  } catch (err) {
    console.error("[notifications] failed to create notification", err);
    return null;
  }
}
