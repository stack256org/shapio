"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { user, workspaces } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { blockUser, unblockUser } from "@/lib/moderation/block";
import { maxMeaningfulLength } from "@/lib/validation/text-length";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

// ─── Block User ───────────────────────────────────────────────────────────────

const blockSchema = z.object({
  workspaceId: z.string().min(1),
  email: z.string().email("Must be a valid email address."),
  reason: z
    .string()
    .refine(maxMeaningfulLength(300), "Reason must be 300 characters or fewer.")
    .optional(),
});

export async function blockUserAction(input: {
  workspaceId: string;
  email: string;
  reason?: string;
}): Promise<ActionResult<{ blockedId: string }>> {
  const session = await requireSession();

  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: first?.message ?? "Invalid input.",
      field: first?.path[0] as string | undefined,
    };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can block users.",
    };
  }

  // A Brand Admin cannot block themselves or the workspace owner (Feature 12).
  const targetEmail = parsed.data.email.trim().toLowerCase();
  if (targetEmail === session.user.email.trim().toLowerCase()) {
    return {
      success: false,
      error: "You can't block yourself.",
      field: "email",
    };
  }
  const [workspace] = await db
    .select({ ownerId: workspaces.ownerId })
    .from(workspaces)
    .where(eq(workspaces.id, parsed.data.workspaceId))
    .limit(1);
  if (workspace?.ownerId) {
    const [owner] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, workspace.ownerId))
      .limit(1);
    if (owner && owner.email.trim().toLowerCase() === targetEmail) {
      return {
        success: false,
        error: "You can't block the workspace owner.",
        field: "email",
      };
    }
  }

  const row = await blockUser(parsed.data.workspaceId, session.user.id, {
    email: parsed.data.email,
    reason: parsed.data.reason,
  });

  return { success: true, data: { blockedId: row.id } };
}

// ─── Unblock User ─────────────────────────────────────────────────────────────

const unblockSchema = z.object({
  blockedId: z.string().min(1),
  workspaceId: z.string().min(1),
});

export async function unblockUserAction(input: {
  blockedId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const parsed = unblockSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can unblock users.",
    };
  }

  await unblockUser(
    parsed.data.blockedId,
    parsed.data.workspaceId,
    session.user.id
  );

  return { success: true, data: undefined };
}
