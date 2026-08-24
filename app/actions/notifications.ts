"use server";

import { getCurrentSession, requireSession } from "@/lib/authz";
import type { NotificationPreferencesRow } from "@/lib/notifications/queries";
import { getNotificationPreferences } from "@/lib/notifications/queries";
import { updatePreferences } from "@/lib/notifications/update-preferences";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; code?: "UNAUTHENTICATED" };

export async function getNotificationPreferencesAction(): Promise<
  ActionResult<NotificationPreferencesRow>
> {
  const session = await requireSession();

  const prefs = await getNotificationPreferences(session.user.id);
  const defaults: NotificationPreferencesRow = {
    userId: session.user.id,
    emailStatusChange: true,
    emailNewComment: true,
    emailChangelog: true,
    inAppStatusChange: true,
    inAppNewComment: true,
    inAppChangelog: true,
    updatedAt: new Date(),
  };

  return { success: true, data: prefs ?? defaults };
}

export async function updateNotificationPreferencesAction(input: {
  emailStatusChange?: boolean;
  emailNewComment?: boolean;
  emailChangelog?: boolean;
  inAppStatusChange?: boolean;
  inAppNewComment?: boolean;
  inAppChangelog?: boolean;
}): Promise<ActionResult<NotificationPreferencesRow>> {
  // Direct/non-embed callers only now — the embed widget's SubscribeToggle
  // calls the bearer-authenticated app/api/embed/notification-preferences
  // Route Handler instead (a Server Action can't carry a custom
  // Authorization header from the client). Still getCurrentSession (not
  // requireSession): a stale/expired cookie session should surface as a
  // normal error the caller can react to, not a server-triggered redirect.
  const session = await getCurrentSession();
  if (!session) {
    return {
      success: false,
      error: "Your session has expired. Please sign in again.",
      code: "UNAUTHENTICATED",
    };
  }

  const result = await updatePreferences(session.user.id, input);
  if (!result.ok) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}
