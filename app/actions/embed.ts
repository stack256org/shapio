"use server";

import { z } from "zod";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { upsertEmbedConfig } from "@/lib/embed/queries";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const hexColor = z
  .string()
  .regex(HEX_COLOR, "Must be a hex color like #2563eb.");

const updateSchema = z.object({
  workspaceId: z.string().min(1),
  buttonType: z.enum(["floating", "sticky"]),
  theme: z.enum(["light", "dark", "auto"]),
  width: z.number().int().min(240).max(1200),
  height: z.number().int().min(240).max(1200),
  accentColor: hexColor,
  floatingPosition: z.enum([
    "bottom-right",
    "bottom-left",
    "top-right",
    "top-left",
  ]),
  floatingIconType: z.enum(["logo", "custom"]),
  floatingIconUrl: z.string().url().nullable(),
  stickyButtonText: z.string().trim().min(1).max(40),
  stickyButtonColor: hexColor,
  stickyTextColor: hexColor,
  stickyPosition: z.enum([
    "left-top",
    "left-middle",
    "left-bottom",
    "right-top",
    "right-middle",
    "right-bottom",
  ]),
  deviceVisibility: z.object({
    desktop: z.boolean(),
    mobile: z.boolean(),
    tablet: z.boolean(),
  }),
  showRoadmap: z.boolean(),
  showChangelog: z.boolean(),
  showSubmitFormImmediately: z.enum(["auto", "always", "never"]),
  showSimilarPosts: z.boolean(),
  showViewOtherFeedbackButton: z.boolean(),
});

type UpdateEmbedConfigInput = z.infer<typeof updateSchema>;

export async function updateEmbedConfigAction(
  input: UpdateEmbedConfigInput
): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const parsed = updateSchema.safeParse(input);
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
      error: "Only admins and owners can configure the embed widget.",
    };
  }

  const { workspaceId, ...rest } = parsed.data;
  await upsertEmbedConfig(workspaceId, rest);

  audit({
    workspaceId,
    action: "embed_config.updated",
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name ?? null,
    entityType: "embed_config",
    entityId: workspaceId,
    entityName: "Embed widget",
    description: "Embed widget configuration updated",
    metadata: rest,
  });

  return { success: true, data: undefined };
}
