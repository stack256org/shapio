"use server";

import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { WORKSPACE_MEMBER, WORKSPACE_OWNER } from "@/config/platform";
import { user, workspaceMembers, workspaces } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { enqueueEmail } from "@/lib/email";
import { WorkspaceDeletedEmail } from "@/lib/email/components/workspace-deleted";
import { renderEmailTemplate } from "@/lib/email/renderer";
import {
  maxMeaningfulLength,
  minMeaningfulLength,
} from "@/lib/validation/text-length";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import { isSlugReserved, validateSlugFormat } from "@/lib/workspaces/slug";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

// ─── Update Visibility (roadmap / changelog) ──────────────────────────────────

const updateVisibilitySchema = z.object({
  workspaceId: z.string().min(1),
  roadmapPublic: z.boolean().optional(),
  changelogPublic: z.boolean().optional(),
});

export async function updateWorkspaceSettingsAction(input: {
  workspaceId: string;
  roadmapPublic?: boolean;
  changelogPublic?: boolean;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const parsed = updateVisibilitySchema.safeParse(input);
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
      error: "Only admins and owners can update workspace settings.",
    };
  }

  const updates: Partial<{
    roadmapPublic: boolean;
    changelogPublic: boolean;
    updatedAt: Date;
  }> = { updatedAt: new Date() };

  if (parsed.data.roadmapPublic !== undefined) {
    updates.roadmapPublic = parsed.data.roadmapPublic;
  }
  if (parsed.data.changelogPublic !== undefined) {
    updates.changelogPublic = parsed.data.changelogPublic;
  }

  await db
    .update(workspaces)
    .set(updates)
    .where(eq(workspaces.id, parsed.data.workspaceId));

  audit({
    workspaceId: parsed.data.workspaceId,
    action: "workspace.settings_updated",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "workspace",
    entityId: parsed.data.workspaceId,
    description: "Workspace visibility settings updated",
    metadata: {
      roadmapPublic: parsed.data.roadmapPublic,
      changelogPublic: parsed.data.changelogPublic,
    },
  });

  return { success: true, data: undefined };
}

// ─── Update General Info (name, slug, description, logoUrl) ───────────────────

const updateInfoSchema = z.object({
  workspaceId: z.string().min(1),
  name: z
    .string()
    .refine(minMeaningfulLength(2), "Name must be at least 2 characters.")
    .refine(maxMeaningfulLength(64), "Name must be 64 characters or fewer.")
    .optional(),
  slug: z.string().min(2).max(48).optional(),
  description: z
    .string()
    .refine(
      maxMeaningfulLength(300),
      "Description must be 300 characters or fewer."
    )
    .optional()
    .nullable(),
  logoUrl: z.string().url("Must be a valid URL.").optional().nullable(),
});

export async function updateWorkspaceInfoAction(input: {
  workspaceId: string;
  name?: string;
  slug?: string;
  description?: string | null;
  logoUrl?: string | null;
}): Promise<ActionResult<{ newSlug?: string }>> {
  const session = await requireSession();

  const parsed = updateInfoSchema.safeParse(input);
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
      error: "Only admins and owners can update workspace settings.",
    };
  }

  type WorkspaceUpdate = {
    name?: string;
    slug?: string;
    description?: string | null;
    logoUrl?: string | null;
    updatedAt: Date;
  };
  const updates: WorkspaceUpdate = { updatedAt: new Date() };
  const changes: Record<string, unknown> = {};

  if (parsed.data.name !== undefined) {
    updates.name = parsed.data.name.trim();
    changes.name = parsed.data.name.trim();
  }

  if (parsed.data.slug !== undefined) {
    const slugError = validateSlugFormat(parsed.data.slug);
    if (slugError) {
      return { success: false, error: slugError, field: "slug" };
    }
    if (isSlugReserved(parsed.data.slug)) {
      return { success: false, error: "This URL is reserved.", field: "slug" };
    }
    // Check uniqueness — exclude current workspace
    const [existing] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(
        and(
          eq(workspaces.slug, parsed.data.slug),
          ne(workspaces.id, parsed.data.workspaceId)
        )
      )
      .limit(1);
    if (existing) {
      return {
        success: false,
        error: "This URL is already taken.",
        field: "slug",
      };
    }
    updates.slug = parsed.data.slug;
    changes.slug = parsed.data.slug;
  }

  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description ?? null;
    changes.description = parsed.data.description ?? null;
  }
  if (parsed.data.logoUrl !== undefined) {
    updates.logoUrl = parsed.data.logoUrl ?? null;
    changes.logoUrl = parsed.data.logoUrl ?? null;
  }

  await db
    .update(workspaces)
    .set(updates)
    .where(eq(workspaces.id, parsed.data.workspaceId));

  audit({
    workspaceId: parsed.data.workspaceId,
    action: "workspace.settings_updated",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name ?? null,
    entityType: "workspace",
    entityId: parsed.data.workspaceId,
    description: "Workspace general info updated",
    metadata: { changes },
  });

  return { success: true, data: { newSlug: parsed.data.slug } };
}

// ─── Delete Workspace ─────────────────────────────────────────────────────────

export async function deleteWorkspaceAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  confirmName: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || member.role !== WORKSPACE_OWNER) {
    return {
      success: false,
      error: "Only the workspace owner can delete the workspace.",
    };
  }

  // Fetch workspace to verify name matches confirmation
  const workspace = await getWorkspaceBySlug(input.workspaceSlug);
  if (!workspace || workspace.id !== input.workspaceId) {
    return { success: false, error: "Workspace not found." };
  }

  if (workspace.name.trim() !== input.confirmName.trim()) {
    return {
      success: false,
      error:
        "Workspace name does not match. Please type the exact name to confirm.",
    };
  }

  // Collect member emails BEFORE deleting (the CASCADE removes membership rows).
  const recipients = await db
    .select({ email: user.email })
    .from(workspaceMembers)
    .innerJoin(user, eq(workspaceMembers.userId, user.id))
    .where(eq(workspaceMembers.workspaceId, input.workspaceId));

  // Hard delete — CASCADE removes all child data
  await db.delete(workspaces).where(eq(workspaces.id, input.workspaceId));

  // Notify every former member that the workspace was deleted (Feature 02).
  await sendWorkspaceDeletedEmails(
    recipients.map((r) => r.email),
    workspace.name
  );

  // Audit log is fire-and-forget (workspace is gone, but log is global)
  audit({
    action: "workspace.deleted",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name ?? null,
    entityType: "workspace",
    entityId: input.workspaceId,
    entityName: workspace.name,
    description: `Workspace deleted: ${workspace.name}`,
    metadata: { name: workspace.name, slug: workspace.slug },
  });

  return { success: true, data: undefined };
}

async function sendWorkspaceDeletedEmails(
  emails: string[],
  workspaceName: string
): Promise<void> {
  if (emails.length === 0) {
    return;
  }
  try {
    // Content is identical for every recipient — render once, enqueue per email.
    const html = await renderEmailTemplate(
      WorkspaceDeletedEmail({ workspaceName })
    );
    const subject = `The workspace "${workspaceName}" has been deleted`;
    for (const email of new Set(emails)) {
      await enqueueEmail({ to: email, subject, html });
    }
  } catch (err) {
    console.error(
      "[workspace-settings] failed to enqueue deletion emails",
      err
    );
  }
}

// ─── Update Moderation Settings ───────────────────────────────────────────────

const moderationSchema = z.object({
  workspaceId: z.string().min(1),
  moderationMode: z.enum(["off", "auto", "manual"]).optional(),
  commentModeration: z.boolean().optional(),
  spamKeywords: z
    .array(z.string().min(1).refine(maxMeaningfulLength(100)))
    .max(50)
    .optional(),
});

export async function updateModerationSettingsAction(input: {
  workspaceId: string;
  moderationMode?: "off" | "auto" | "manual";
  commentModeration?: boolean;
  spamKeywords?: string[];
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const parsed = moderationSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: first?.message ?? "Invalid input.",
    };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can update moderation settings.",
    };
  }

  type ModerationUpdate = {
    moderationMode?: "off" | "auto" | "manual";
    commentModeration?: boolean;
    spamKeywords?: string[];
    updatedAt: Date;
  };
  const updates: ModerationUpdate = { updatedAt: new Date() };
  const changes: Record<string, unknown> = {};

  if (parsed.data.moderationMode !== undefined) {
    updates.moderationMode = parsed.data.moderationMode;
    changes.moderationMode = parsed.data.moderationMode;
  }
  if (parsed.data.commentModeration !== undefined) {
    updates.commentModeration = parsed.data.commentModeration;
    changes.commentModeration = parsed.data.commentModeration;
  }
  if (parsed.data.spamKeywords !== undefined) {
    const cleaned = [
      ...new Set(
        parsed.data.spamKeywords
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean)
      ),
    ];
    updates.spamKeywords = cleaned;
    changes.spamKeywords = cleaned;
  }

  await db
    .update(workspaces)
    .set(updates)
    .where(eq(workspaces.id, parsed.data.workspaceId));

  audit({
    workspaceId: parsed.data.workspaceId,
    action: "moderation.mode_changed",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name ?? null,
    entityType: "workspace",
    entityId: parsed.data.workspaceId,
    description: "Moderation settings updated",
    metadata: { changes },
  });

  return { success: true, data: undefined };
}
