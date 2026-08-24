"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { workspaces } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getCurrentSession, requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  followRoadmap,
  isFollowingRoadmap,
  unfollowRoadmap,
} from "@/lib/roadmap/followers";
import {
  createRoadmapItem,
  deleteRoadmapItem,
  getRoadmapItemById,
  moveRoadmapItem,
  updateRoadmapItem,
} from "@/lib/roadmap/items";
import {
  countRoadmapItems,
  type FeedbackSearchResult,
  getFeedbackForImport,
  searchWorkspaceFeedback,
} from "@/lib/roadmap/manual";
import {
  countItemsInStatus,
  createRoadmapStatus,
  deleteRoadmapStatus,
  ensureRoadmapStatuses,
  getRoadmapStatusById,
  reorderRoadmapStatuses,
  updateRoadmapStatus,
} from "@/lib/roadmap/statuses";
import { uploadFile } from "@/lib/storage";
import { countCharacters } from "@/lib/text-metrics";
import {
  maxMeaningfulLength,
  minMeaningfulLength,
} from "@/lib/validation/text-length";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// Any team member (Brand Admin or Team Member) may triage the manual roadmap —
// creating, editing, moving, and deleting items, mirroring feedback triage.
async function requireTeamMember(workspaceId: string) {
  const session = await requireSession();
  const member = await getWorkspaceMember(workspaceId, session.user.id);
  if (!member) {
    return {
      ok: false as const,
      error: "You are not a member of this workspace.",
    };
  }
  return { ok: true as const, session, member };
}

// Structural changes — the sync toggle and roadmap columns — are Brand Admin
// only, matching how feedback statuses and workspace settings are governed.
async function requireBrandAdmin(workspaceId: string) {
  const session = await requireSession();
  const member = await getWorkspaceMember(workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      ok: false as const,
      error: "Only admins and owners can manage roadmap settings.",
    };
  }
  return { ok: true as const, session, member };
}

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// Following the roadmap requires a signed-in User (Feature 09). A not-signed-in
// visitor is prompted to sign in (the client returns code "UNAUTHENTICATED").
export async function toggleRoadmapFollowAction(input: {
  workspaceId: string;
  follow: boolean;
}): Promise<ActionResult<{ following: boolean }>> {
  const session = await getCurrentSession();
  if (!session) {
    return {
      success: false,
      error: "Sign in to follow the roadmap.",
      code: "UNAUTHENTICATED",
    };
  }

  if (input.follow) {
    await followRoadmap(input.workspaceId, session.user.id);
  } else {
    await unfollowRoadmap(input.workspaceId, session.user.id);
  }

  return { success: true, data: { following: input.follow } };
}

export async function getRoadmapFollowStateAction(
  workspaceId: string
): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) {
    return false;
  }
  return isFollowingRoadmap(workspaceId, session.user.id);
}

// ─── Sync toggle ──────────────────────────────────────────────────────────────

// "Sync Roadmap from Feedback". ON → derived, read-only. OFF → independent,
// manual. Turning it off seeds default columns so the manual board is never
// blank. Brand Admin only.
export async function setRoadmapSyncAction(input: {
  workspaceId: string;
  enabled: boolean;
}): Promise<ActionResult<{ enabled: boolean }>> {
  const auth = await requireBrandAdmin(input.workspaceId);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  await db
    .update(workspaces)
    .set({ roadmapSyncEnabled: input.enabled, updatedAt: new Date() })
    .where(eq(workspaces.id, input.workspaceId));

  // Guarantee the manual board has columns the moment sync is turned off.
  if (!input.enabled) {
    await ensureRoadmapStatuses(input.workspaceId);
  }

  audit({
    workspaceId: input.workspaceId,
    action: "workspace.settings_updated",
    actorId: auth.session.user.id,
    actorEmail: auth.session.user.email,
    entityType: "workspace",
    entityId: input.workspaceId,
    description: input.enabled
      ? "Roadmap sync from feedback enabled"
      : "Roadmap sync from feedback disabled",
    metadata: { roadmapSyncEnabled: input.enabled },
  });

  return { success: true, data: { enabled: input.enabled } };
}

// ─── Roadmap columns (statuses) — Brand Admin only ────────────────────────────

const statusInputSchema = z.object({
  workspaceId: z.string().min(1),
  name: z
    .string()
    .refine(minMeaningfulLength(1), "Name is required.")
    .refine(maxMeaningfulLength(48), "Name is too long."),
  color: z.string().regex(COLOR_RE, "Invalid color.").optional(),
});

export async function createRoadmapStatusAction(input: {
  workspaceId: string;
  name: string;
  color?: string;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = statusInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const auth = await requireBrandAdmin(parsed.data.workspaceId);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const status = await createRoadmapStatus({
    workspaceId: parsed.data.workspaceId,
    name: parsed.data.name,
    color: parsed.data.color,
  });
  return { success: true, data: { id: status.id } };
}

export async function updateRoadmapStatusAction(input: {
  workspaceId: string;
  statusId: string;
  name?: string;
  color?: string;
}): Promise<ActionResult> {
  const auth = await requireBrandAdmin(input.workspaceId);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  if (input.name !== undefined && countCharacters(input.name) === 0) {
    return { success: false, error: "Name is required." };
  }
  if (input.color !== undefined && !COLOR_RE.test(input.color)) {
    return { success: false, error: "Invalid color." };
  }
  const status = await getRoadmapStatusById(input.statusId);
  if (!status || status.workspaceId !== input.workspaceId) {
    return { success: false, error: "Column not found." };
  }
  await updateRoadmapStatus(input.statusId, {
    name: input.name,
    color: input.color,
  });
  return { success: true, data: undefined };
}

export async function deleteRoadmapStatusAction(input: {
  workspaceId: string;
  statusId: string;
}): Promise<ActionResult> {
  const auth = await requireBrandAdmin(input.workspaceId);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const status = await getRoadmapStatusById(input.statusId);
  if (!status || status.workspaceId !== input.workspaceId) {
    return { success: false, error: "Column not found." };
  }
  const itemCount = await countItemsInStatus(input.statusId);
  if (itemCount > 0) {
    return {
      success: false,
      error: `Move or delete the ${itemCount} item${itemCount === 1 ? "" : "s"} in this column first.`,
    };
  }
  await deleteRoadmapStatus(input.statusId);
  return { success: true, data: undefined };
}

export async function reorderRoadmapStatusesAction(input: {
  workspaceId: string;
  orderedIds: string[];
}): Promise<ActionResult> {
  const auth = await requireBrandAdmin(input.workspaceId);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  await reorderRoadmapStatuses(input.workspaceId, input.orderedIds);
  return { success: true, data: undefined };
}

// ─── Roadmap items — any team member ──────────────────────────────────────────

const itemInputSchema = z.object({
  workspaceId: z.string().min(1),
  statusId: z.string().min(1),
  title: z
    .string()
    .refine(minMeaningfulLength(1), "Title is required.")
    .refine(maxMeaningfulLength(160), "Title is too long."),
  // Rich-text HTML from the Quill editor — allow room for markup.
  description: z
    .string()
    .refine(
      maxMeaningfulLength(50_000),
      "Description must be 50,000 characters or fewer."
    )
    .nullish(),
  launchDate: z.string().nullish(),
  coverImage: z.string().url("Cover image must be a valid URL.").nullish(),
  feedbackId: z.string().nullish(),
});

function parseLaunchDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createRoadmapItemAction(input: {
  workspaceId: string;
  statusId: string;
  title: string;
  description?: string | null;
  launchDate?: string | null;
  coverImage?: string | null;
  feedbackId?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = itemInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const auth = await requireTeamMember(parsed.data.workspaceId);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const status = await getRoadmapStatusById(parsed.data.statusId);
  if (!status || status.workspaceId !== parsed.data.workspaceId) {
    return { success: false, error: "Column not found." };
  }
  const item = await createRoadmapItem({
    workspaceId: parsed.data.workspaceId,
    statusId: parsed.data.statusId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    launchDate: parseLaunchDate(parsed.data.launchDate),
    coverImage: parsed.data.coverImage ?? null,
    feedbackId: parsed.data.feedbackId ?? null,
  });
  return { success: true, data: { id: item.id } };
}

export async function updateRoadmapItemAction(input: {
  workspaceId: string;
  itemId: string;
  title?: string;
  description?: string | null;
  launchDate?: string | null;
  coverImage?: string | null;
  statusId?: string;
  feedbackId?: string | null;
}): Promise<ActionResult> {
  const auth = await requireTeamMember(input.workspaceId);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const item = await getRoadmapItemById(input.itemId);
  if (!item || item.workspaceId !== input.workspaceId) {
    return { success: false, error: "Item not found." };
  }
  if (input.title !== undefined && input.title.trim().length === 0) {
    return { success: false, error: "Title is required." };
  }
  if (input.coverImage) {
    try {
      new URL(input.coverImage);
    } catch {
      return { success: false, error: "Cover image must be a valid URL." };
    }
  }
  if (input.statusId) {
    const status = await getRoadmapStatusById(input.statusId);
    if (!status || status.workspaceId !== input.workspaceId) {
      return { success: false, error: "Column not found." };
    }
  }
  await updateRoadmapItem(input.itemId, {
    title: input.title,
    description: input.description,
    launchDate:
      input.launchDate === undefined
        ? undefined
        : parseLaunchDate(input.launchDate),
    coverImage: input.coverImage,
    statusId: input.statusId,
    feedbackId: input.feedbackId,
  });
  return { success: true, data: undefined };
}

export async function deleteRoadmapItemAction(input: {
  workspaceId: string;
  itemId: string;
}): Promise<ActionResult> {
  const auth = await requireTeamMember(input.workspaceId);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const item = await getRoadmapItemById(input.itemId);
  if (!item || item.workspaceId !== input.workspaceId) {
    return { success: false, error: "Item not found." };
  }
  await deleteRoadmapItem(input.itemId);
  return { success: true, data: undefined };
}

// Persist a drag-and-drop: the item lands in `statusId` and the target column is
// renumbered to `orderedIds`.
export async function moveRoadmapItemAction(input: {
  workspaceId: string;
  itemId: string;
  statusId: string;
  orderedIds: string[];
}): Promise<ActionResult> {
  const auth = await requireTeamMember(input.workspaceId);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const [item, status] = await Promise.all([
    getRoadmapItemById(input.itemId),
    getRoadmapStatusById(input.statusId),
  ]);
  if (!item || item.workspaceId !== input.workspaceId) {
    return { success: false, error: "Item not found." };
  }
  if (!status || status.workspaceId !== input.workspaceId) {
    return { success: false, error: "Column not found." };
  }
  await moveRoadmapItem({
    workspaceId: input.workspaceId,
    itemId: input.itemId,
    statusId: input.statusId,
    orderedIds: input.orderedIds,
  });
  return { success: true, data: undefined };
}

// ─── Feedback search (Fill from Feedback panel) ───────────────────────────────

export async function searchRoadmapFeedbackAction(input: {
  workspaceId: string;
  query?: string;
  offset?: number;
}): Promise<
  ActionResult<{ results: FeedbackSearchResult[]; hasMore: boolean }>
> {
  const auth = await requireTeamMember(input.workspaceId);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const data = await searchWorkspaceFeedback(input.workspaceId, {
    query: input.query,
    offset: input.offset ?? 0,
  });
  return { success: true, data };
}

// One-time import: returns just the title + description to copy into the form.
export async function getRoadmapFeedbackImportAction(input: {
  workspaceId: string;
  postId: string;
}): Promise<
  ActionResult<{ id: string; title: string; description: string | null }>
> {
  const auth = await requireTeamMember(input.workspaceId);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const data = await getFeedbackForImport(input.workspaceId, input.postId);
  if (!data) {
    return { success: false, error: "Feedback not found." };
  }
  return { success: true, data };
}

export async function countRoadmapItemsAction(
  workspaceId: string
): Promise<number> {
  return countRoadmapItems(workspaceId);
}

// ─── Cover image upload ───────────────────────────────────────────────────────

const ALLOWED_COVER_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_COVER_IMAGE_BYTES = 4 * 1024 * 1024;

// Uploads a roadmap item cover image and returns its hosted URL (mirrors the
// changelog cover upload). Any team member may upload, matching item triage.
export async function uploadRoadmapCoverImageAction(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const auth = await requireTeamMember(workspaceId);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const file = formData.get("image");
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
    `roadmap/${workspaceId}-${Date.now()}.${extension}`,
    buffer,
    file.type
  );

  return { success: true, data: { url } };
}
