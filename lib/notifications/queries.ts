import { and, count, desc, eq, inArray, lt } from "drizzle-orm";
import {
  notificationPreferences,
  notifications,
} from "@/db/schema/notifications";
import { posts } from "@/db/schema/posts";
import { db } from "@/lib/db";

export type NotificationRow = typeof notifications.$inferSelect;
export type NotificationPreferencesRow =
  typeof notificationPreferences.$inferSelect;

// A notification row augmented with whether the resource it links to still
// exists. `targetMissing` lets the UI mark deleted-resource notifications as
// removed and avoid navigating the user into a 404.
export type NotificationListItem = NotificationRow & { targetMissing: boolean };

// Every deletable notification target is a feedback post linked as
// `/{workspaceSlug}/feedback/{postId}` (comments, replies, status changes,
// assignments and new-post alerts all point here). Changelog notifications link
// to the always-present settings list page, so they are never "missing".
const FEEDBACK_LINK_RE = /^\/[^/]+\/feedback\/([^/?#]+)/;

function extractFeedbackPostId(link: string): string | null {
  return FEEDBACK_LINK_RE.exec(link)?.[1] ?? null;
}

// ─── Unread Count ─────────────────────────────────────────────────────────────

export async function getUnreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
  return row?.value ?? 0;
}

// ─── List Notifications ───────────────────────────────────────────────────────

export async function listNotifications(
  userId: string,
  opts: { page?: number; limit?: number } = {}
): Promise<{ items: NotificationListItem[]; total: number; hasMore: boolean }> {
  const { page = 1, limit = 30 } = opts;
  const offset = (page - 1) * limit;

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(notifications)
      .where(eq(notifications.userId, userId)),
  ]);

  // Resolve which linked feedback posts still exist in a single batched query,
  // so a deleted post can be surfaced as "removed" instead of a broken link.
  const postIds = Array.from(
    new Set(
      rows
        .map((n) => extractFeedbackPostId(n.link))
        .filter((id): id is string => id !== null)
    )
  );
  const existingPostIds = new Set<string>();
  if (postIds.length > 0) {
    const existing = await db
      .select({ id: posts.id })
      .from(posts)
      .where(inArray(posts.id, postIds));
    for (const row of existing) {
      existingPostIds.add(row.id);
    }
  }

  const items: NotificationListItem[] = rows.map((n) => {
    const postId = extractFeedbackPostId(n.link);
    return {
      ...n,
      targetMissing: postId !== null && !existingPostIds.has(postId),
    };
  });

  return {
    items,
    total: Number(total),
    hasMore: offset + items.length < Number(total),
  };
}

// ─── Mark Single As Read ──────────────────────────────────────────────────────

export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      )
    );
}

// ─── Delete Single ────────────────────────────────────────────────────────────

export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<void> {
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      )
    );
}

// ─── Mark All As Read ─────────────────────────────────────────────────────────

export async function markAllNotificationsAsRead(
  userId: string,
  workspaceId?: string
): Promise<number> {
  const conditions = [
    eq(notifications.userId, userId),
    eq(notifications.isRead, false),
  ];
  if (workspaceId) {
    conditions.push(eq(notifications.workspaceId, workspaceId));
  }

  const result = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(...conditions))
    .returning({ id: notifications.id });

  return result.length;
}

// ─── Clear All ────────────────────────────────────────────────────────────────

export async function clearAllNotifications(
  userId: string,
  workspaceId?: string
): Promise<number> {
  const conditions = [eq(notifications.userId, userId)];
  if (workspaceId) {
    conditions.push(eq(notifications.workspaceId, workspaceId));
  }

  const result = await db
    .delete(notifications)
    .where(and(...conditions))
    .returning({ id: notifications.id });

  return result.length;
}

// ─── Preferences ──────────────────────────────────────────────────────────────

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferencesRow | null> {
  const [row] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function upsertNotificationPreferences(
  userId: string,
  prefs: Partial<Omit<NotificationPreferencesRow, "userId" | "updatedAt">>
): Promise<NotificationPreferencesRow> {
  const [row] = await db
    .insert(notificationPreferences)
    .values({ userId, ...prefs })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: { ...prefs, updatedAt: new Date() },
    })
    .returning();
  return row!;
}

// Opt-out model: a missing preferences row (or column) means the email is
// enabled. Used by notification dispatch to honour per-user unsubscribe choices.
export async function isEmailNotificationEnabled(
  userId: string,
  field: "emailStatusChange" | "emailNewComment" | "emailChangelog"
): Promise<boolean> {
  const [row] = await db
    .select({ value: notificationPreferences[field] })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return row?.value !== false;
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export async function pruneOldNotifications(
  olderThanDays = 90
): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await db
    .delete(notifications)
    .where(
      and(eq(notifications.isRead, true), lt(notifications.createdAt, cutoff))
    )
    .returning({ id: notifications.id });
  return result.length;
}
