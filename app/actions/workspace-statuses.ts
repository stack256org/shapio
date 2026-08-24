"use server";

import { z } from "zod";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import {
  maxMeaningfulLength,
  minMeaningfulLength,
} from "@/lib/validation/text-length";
import { createWorkspaceStatus } from "@/lib/workspace-statuses/create";
import { deleteWorkspaceStatus } from "@/lib/workspace-statuses/delete";
import { getWorkspaceStatusById } from "@/lib/workspace-statuses/queries";
import {
  reorderWorkspaceStatuses,
  setDefaultStatus,
  updateWorkspaceStatus,
} from "@/lib/workspace-statuses/update";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

// ─── Create Status ────────────────────────────────────────────────────────────

const createStatusSchema = z.object({
  workspaceId: z.string().min(1),
  name: z
    .string()
    .refine(minMeaningfulLength(1), "Name is required.")
    .refine(maxMeaningfulLength(48), "Name must be 48 characters or fewer."),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color.")
    .optional(),
});

export async function createWorkspaceStatusAction(input: {
  workspaceId: string;
  name: string;
  color?: string;
}): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  const parsed = createStatusSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: first?.message ?? "Invalid input.",
      field: first?.path[0] as string,
    };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage statuses.",
    };
  }

  try {
    const status = await createWorkspaceStatus({
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      color: parsed.data.color,
    });

    audit({
      action: "workspace_status.created",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: `Status created: ${status.name}`,
      entityType: "workspace_status",
      entityId: status.id,
      metadata: { name: status.name, workspaceId: parsed.data.workspaceId },
    });

    return { success: true, data: { id: status.id } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create status.";
    if (msg.includes("unique")) {
      return {
        success: false,
        error: "A status with this name already exists.",
        field: "name",
      };
    }
    return { success: false, error: msg };
  }
}

// ─── Update Status ────────────────────────────────────────────────────────────

const updateStatusSchema = z.object({
  statusId: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z
    .string()
    .refine(minMeaningfulLength(1), "Name is required.")
    .refine(maxMeaningfulLength(48), "Name must be 48 characters or fewer.")
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  isArchived: z.boolean().optional(),
  showOnRoadmap: z.boolean().optional(),
  showOnPublicFeed: z.boolean().optional(),
});

export async function updateWorkspaceStatusAction(input: {
  statusId: string;
  workspaceId: string;
  name?: string;
  color?: string;
  isArchived?: boolean;
  showOnRoadmap?: boolean;
  showOnPublicFeed?: boolean;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Invalid input." };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage statuses.",
    };
  }

  const status = await getWorkspaceStatusById(parsed.data.statusId);
  if (!status || status.workspaceId !== parsed.data.workspaceId) {
    return { success: false, error: "Status not found." };
  }

  try {
    await updateWorkspaceStatus(parsed.data.statusId, {
      name: parsed.data.name,
      color: parsed.data.color,
      isArchived: parsed.data.isArchived,
      showOnRoadmap: parsed.data.showOnRoadmap,
      showOnPublicFeed: parsed.data.showOnPublicFeed,
    });

    return { success: true, data: undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update status.";
    return { success: false, error: msg };
  }
}

// ─── Set Default Status ───────────────────────────────────────────────────────

export async function setDefaultStatusAction(input: {
  statusId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage statuses.",
    };
  }

  const status = await getWorkspaceStatusById(input.statusId);
  if (!status || status.workspaceId !== input.workspaceId) {
    return { success: false, error: "Status not found." };
  }

  await setDefaultStatus(input.workspaceId, input.statusId);
  return { success: true, data: undefined };
}

// ─── Delete Status ────────────────────────────────────────────────────────────

export async function deleteWorkspaceStatusAction(input: {
  statusId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage statuses.",
    };
  }

  const status = await getWorkspaceStatusById(input.statusId);
  if (!status || status.workspaceId !== input.workspaceId) {
    return { success: false, error: "Status not found." };
  }

  try {
    await deleteWorkspaceStatus(input.statusId, {
      id: session.user.id,
      name: session.user.name,
    });

    audit({
      action: "workspace_status.deleted",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: `Status deleted: ${status.name}`,
      entityType: "workspace_status",
      entityId: input.statusId,
      metadata: { name: status.name, workspaceId: input.workspaceId },
    });

    return { success: true, data: undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete status.";
    return { success: false, error: msg };
  }
}

// ─── Reorder Statuses ─────────────────────────────────────────────────────────

export async function reorderWorkspaceStatusesAction(input: {
  workspaceId: string;
  orderedIds: string[];
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage statuses.",
    };
  }

  await reorderWorkspaceStatuses(input.workspaceId, input.orderedIds);
  return { success: true, data: undefined };
}
