import { z } from "zod";
import type { NotificationPreferencesRow } from "@/lib/notifications/queries";
import { upsertNotificationPreferences } from "@/lib/notifications/queries";

// Business logic shared between updateNotificationPreferencesAction (Server
// Action, cookie auth, non-embed) and app/api/embed/notification-preferences
// (Route Handler, bearer auth, embed widget) — one implementation, two thin
// auth/response wrappers, mirroring lib/posts/submit-feedback.ts. This
// function owns everything except the initial session lookup (each caller's
// auth mechanism differs). No zod schema existed on the original Server
// Action (a native call has no untyped-JSON boundary to validate) — added
// here since a Route Handler's raw JSON body does.
export const updatePreferencesSchema = z.object({
  emailStatusChange: z.boolean().optional(),
  emailNewComment: z.boolean().optional(),
  emailChangelog: z.boolean().optional(),
  inAppStatusChange: z.boolean().optional(),
  inAppNewComment: z.boolean().optional(),
  inAppChangelog: z.boolean().optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export type UpdatePreferencesResult =
  | { data: NotificationPreferencesRow; ok: true }
  | { error: string; ok: false };

export async function updatePreferences(
  userId: string,
  rawInput: unknown
): Promise<UpdatePreferencesResult> {
  const parsed = updatePreferencesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const updated = await upsertNotificationPreferences(userId, parsed.data);
    return { ok: true, data: updated };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Failed to update preferences.",
    };
  }
}
