"use server";

import { z } from "zod";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import {
  CHANGELOG_LABEL_VALUES,
  getLabelInfo,
} from "@/lib/changelog/constants";
import { createChangelogEntry } from "@/lib/changelog/create";
import { deleteChangelogEntry } from "@/lib/changelog/delete";
import {
  ChangelogLabelError,
  createChangelogLabel,
  deleteChangelogLabel,
  updateChangelogLabel,
} from "@/lib/changelog/labels";
import {
  publishChangelogEntry,
  unpublishChangelogEntry,
} from "@/lib/changelog/publish";
import { searchWorkspacePosts } from "@/lib/changelog/queries";
import { updateChangelogEntry } from "@/lib/changelog/update";
import { uploadFile } from "@/lib/storage";
import {
  maxMeaningfulLength,
  minMeaningfulLength,
} from "@/lib/validation/text-length";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function isAdminOrOwner(role: string) {
  return role !== WORKSPACE_MEMBER;
}

// ─── Create Entry ─────────────────────────────────────────────────────────────

const createEntrySchema = z.object({
  workspaceId: z.string().min(1),
  title: z
    .string()
    .refine(minMeaningfulLength(1), "Title is required.")
    .refine(maxMeaningfulLength(200), "Title must be 200 characters or fewer."),
  body: z
    .string()
    .refine(
      maxMeaningfulLength(50_000),
      "Body must be 50,000 characters or fewer."
    )
    .default(""),
  coverImageUrl: z.url().optional(),
  // A built-in key or any custom label the author created. Kept short and plain
  // (rendered as text in a badge, so no markup handling needed).
  label: z
    .string()
    .trim()
    .min(1)
    .refine(maxMeaningfulLength(40), "Label must be 40 characters or fewer.")
    .default("new_feature"),
  postIds: z.array(z.string()).max(20).default([]),
});

export async function createChangelogEntryAction(input: {
  workspaceId: string;
  title: string;
  body?: string;
  coverImageUrl?: string;
  label?: string;
  postIds?: string[];
}): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  const parsed = createEntrySchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Invalid input." };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || !isAdminOrOwner(member.role)) {
    return {
      success: false,
      error: "Only admins and owners can create changelog entries.",
    };
  }

  try {
    const entry = await createChangelogEntry({
      workspaceId: parsed.data.workspaceId,
      createdBy: session.user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      coverImageUrl: parsed.data.coverImageUrl,
      label: parsed.data.label,
      postIds: parsed.data.postIds,
    });

    audit({
      action: "changelog.created",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: `Changelog entry created: ${entry.title}`,
      entityType: "changelog_entry",
      entityId: entry.id,
      metadata: { title: entry.title, workspaceId: parsed.data.workspaceId },
    });

    return { success: true, data: { id: entry.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create entry.",
    };
  }
}

// ─── Update Entry ─────────────────────────────────────────────────────────────

const updateEntrySchema = z.object({
  entryId: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z
    .string()
    .refine(minMeaningfulLength(1), "Title is required.")
    .refine(maxMeaningfulLength(200), "Title must be 200 characters or fewer.")
    .optional(),
  body: z
    .string()
    .refine(
      maxMeaningfulLength(50_000),
      "Body must be 50,000 characters or fewer."
    )
    .optional(),
  coverImageUrl: z.union([z.url(), z.literal(null)]).optional(),
  label: z
    .string()
    .trim()
    .min(1)
    .refine(maxMeaningfulLength(40), "Label must be 40 characters or fewer.")
    .optional(),
  postIds: z.array(z.string()).max(20).optional(),
});

export async function updateChangelogEntryAction(input: {
  entryId: string;
  workspaceId: string;
  title?: string;
  body?: string;
  coverImageUrl?: string | null;
  label?: string;
  postIds?: string[];
}): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  const parsed = updateEntrySchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Invalid input." };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || !isAdminOrOwner(member.role)) {
    return {
      success: false,
      error: "Only admins and owners can edit changelog entries.",
    };
  }

  try {
    const entry = await updateChangelogEntry(
      parsed.data.entryId,
      parsed.data.workspaceId,
      {
        title: parsed.data.title,
        body: parsed.data.body,
        coverImageUrl: parsed.data.coverImageUrl,
        label: parsed.data.label,
        postIds: parsed.data.postIds,
      }
    );

    audit({
      action: "changelog.updated",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: `Changelog entry updated: ${entry.title}`,
      entityType: "changelog_entry",
      entityId: entry.id,
      metadata: { title: entry.title, workspaceId: parsed.data.workspaceId },
    });

    return { success: true, data: { id: entry.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update entry.",
    };
  }
}

// ─── Publish Entry ────────────────────────────────────────────────────────────

export async function publishChangelogEntryAction(input: {
  entryId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || !isAdminOrOwner(member.role)) {
    return {
      success: false,
      error: "Only admins and owners can publish changelog entries.",
    };
  }

  try {
    await publishChangelogEntry(input.entryId, input.workspaceId);

    audit({
      action: "changelog.published",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: "Changelog entry published",
      entityType: "changelog_entry",
      entityId: input.entryId,
      metadata: { workspaceId: input.workspaceId },
    });

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to publish entry.",
    };
  }
}

// ─── Unpublish Entry ──────────────────────────────────────────────────────────

export async function unpublishChangelogEntryAction(input: {
  entryId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || !isAdminOrOwner(member.role)) {
    return {
      success: false,
      error: "Only admins and owners can unpublish changelog entries.",
    };
  }

  try {
    await unpublishChangelogEntry(input.entryId, input.workspaceId);

    audit({
      action: "changelog.unpublished",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: "Changelog entry unpublished",
      entityType: "changelog_entry",
      entityId: input.entryId,
      metadata: { workspaceId: input.workspaceId },
    });

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to unpublish entry.",
    };
  }
}

// ─── Delete Entry ─────────────────────────────────────────────────────────────

export async function deleteChangelogEntryAction(input: {
  entryId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || !isAdminOrOwner(member.role)) {
    return {
      success: false,
      error: "Only admins and owners can delete changelog entries.",
    };
  }

  try {
    await deleteChangelogEntry(input.entryId, input.workspaceId);

    audit({
      action: "changelog.deleted",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: "Changelog entry deleted",
      entityType: "changelog_entry",
      entityId: input.entryId,
      metadata: { workspaceId: input.workspaceId },
    });

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete entry.",
    };
  }
}

// ─── Upload Cover Image ───────────────────────────────────────────────────────

const MAX_COVER_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_COVER_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function uploadChangelogCoverImageAction(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const session = await requireSession();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const file = formData.get("image");

  const member = await getWorkspaceMember(workspaceId, session.user.id);
  if (!member || !isAdminOrOwner(member.role)) {
    return {
      success: false,
      error: "Only admins and owners can upload a cover image.",
    };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose an image to upload." };
  }
  if (!ALLOWED_COVER_IMAGE_TYPES.has(file.type)) {
    return { success: false, error: "Use a PNG, JPEG, WEBP, or GIF image." };
  }
  if (file.size > MAX_COVER_IMAGE_BYTES) {
    return { success: false, error: "Image must be 4MB or smaller." };
  }

  const extension = file.type.split("/")[1];
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadFile(
    `changelog/${workspaceId}-${Date.now()}.${extension}`,
    buffer,
    file.type
  );

  return { success: true, data: { url } };
}

// ─── Search Posts ─────────────────────────────────────────────────────────────

export async function searchPostsForChangelogAction(input: {
  workspaceId: string;
  query: string;
}): Promise<
  ActionResult<
    {
      id: string;
      title: string;
      slug: string;
      status: string;
      upvotes: number;
      boardSlug: string;
      boardName: string;
      mergedIntoId: string | null;
      mergedIntoTitle: string | null;
    }[]
  >
> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member) {
    return { success: false, error: "Access denied." };
  }

  try {
    const results = await searchWorkspacePosts(input.workspaceId, input.query);
    return { success: true, data: results };
  } catch {
    return { success: false, error: "Failed to search posts." };
  }
}

// ─── Changelog Labels (custom, persisted) ─────────────────────────────────────
// Creating/renaming/deleting custom labels is admin/owner-only, matching entry
// management. The five built-in labels aren't stored and can't be edited.

const labelNameSchema = z
  .string()
  .trim()
  .min(1, "Label name is required.")
  .max(40, "Label must be 40 characters or fewer.");

// A custom label may not shadow a built-in (by key or display name).
function collidesWithBuiltin(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return CHANGELOG_LABEL_VALUES.some(
    (l) =>
      l.toLowerCase() === lower || getLabelInfo(l).label.toLowerCase() === lower
  );
}

async function requireLabelManager(workspaceId: string) {
  const session = await requireSession();
  const member = await getWorkspaceMember(workspaceId, session.user.id);
  if (!member || !isAdminOrOwner(member.role)) {
    return null;
  }
  return session;
}

export async function createChangelogLabelAction(input: {
  workspaceId: string;
  name: string;
  color?: string;
}): Promise<ActionResult<{ id: string; name: string; color: string }>> {
  const parsed = labelNameSchema.safeParse(input.name);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid name.",
    };
  }
  if (collidesWithBuiltin(parsed.data)) {
    return { success: false, error: "That label already exists." };
  }

  const session = await requireLabelManager(input.workspaceId);
  if (!session) {
    return {
      success: false,
      error: "Only admins and owners can manage changelog labels.",
    };
  }

  try {
    const label = await createChangelogLabel(input.workspaceId, {
      name: parsed.data,
      color: input.color,
    });
    audit({
      action: "changelog_label.created",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: `Changelog label created: ${label.name}`,
      entityType: "changelog_label",
      entityId: label.id,
      metadata: { name: label.name, workspaceId: input.workspaceId },
    });
    return { success: true, data: label };
  } catch (err) {
    if (err instanceof ChangelogLabelError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to create label." };
  }
}

export async function updateChangelogLabelAction(input: {
  labelId: string;
  workspaceId: string;
  name?: string;
  color?: string;
}): Promise<ActionResult<{ id: string; name: string; color: string }>> {
  if (input.name !== undefined) {
    const parsed = labelNameSchema.safeParse(input.name);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid name.",
      };
    }
    if (collidesWithBuiltin(parsed.data)) {
      return { success: false, error: "That label already exists." };
    }
  }

  const session = await requireLabelManager(input.workspaceId);
  if (!session) {
    return {
      success: false,
      error: "Only admins and owners can manage changelog labels.",
    };
  }

  try {
    const label = await updateChangelogLabel(input.labelId, input.workspaceId, {
      name: input.name?.trim(),
      color: input.color,
    });
    audit({
      action: "changelog_label.updated",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: `Changelog label updated: ${label.name}`,
      entityType: "changelog_label",
      entityId: label.id,
      metadata: { name: label.name, workspaceId: input.workspaceId },
    });
    return { success: true, data: label };
  } catch (err) {
    if (err instanceof ChangelogLabelError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to update label." };
  }
}

export async function deleteChangelogLabelAction(input: {
  labelId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireLabelManager(input.workspaceId);
  if (!session) {
    return {
      success: false,
      error: "Only admins and owners can manage changelog labels.",
    };
  }

  await deleteChangelogLabel(input.labelId, input.workspaceId);
  audit({
    action: "changelog_label.deleted",
    actorId: session.user.id,
    actorEmail: session.user.email,
    description: "Changelog label deleted",
    entityType: "changelog_label",
    entityId: input.labelId,
    metadata: { workspaceId: input.workspaceId },
  });
  return { success: true, data: undefined };
}
