import { eq } from "drizzle-orm";
import { workspaceEmbedConfig } from "@/db/schema";
import {
  DEFAULT_DEVICE_VISIBILITY,
  type EmbedButtonType,
  type EmbedDeviceVisibility,
  type EmbedFloatingIconType,
  type EmbedPosition,
  type EmbedStickyPosition,
  type EmbedSubmitTiming,
  type EmbedTheme,
} from "@/db/schema/embed";
import { listBoardsForWorkspace } from "@/lib/boards/queries";
import { db } from "@/lib/db";
import { getWorkspaceBySlug } from "@/lib/workspaces/queries";

export type {
  EmbedButtonType,
  EmbedDeviceVisibility,
  EmbedFloatingIconType,
  EmbedPosition,
  EmbedStickyPosition,
  EmbedSubmitTiming,
  EmbedTheme,
};

// The public, cross-origin shape returned by GET /api/embed/config — only
// what the host page's widget.js needs to render its button and point its
// iframe. Deliberately excludes workspaceId/boardId/timestamps/anything
// internal. Shared with components/settings/widget-preview.tsx so the two
// renderers (widget.js's vanilla DOM, the settings page's React preview)
// can't quietly drift on shape even though they can't share runtime code.
export interface WidgetHostConfig {
  accentColor: string;
  buttonType: EmbedButtonType;
  deviceVisibility: EmbedDeviceVisibility;
  floatingIconType: EmbedFloatingIconType;
  floatingIconUrl: string | null;
  floatingPosition: EmbedPosition;
  height: number;
  // Path only (e.g. "/acme/b/feedback") — widget.js prepends its own
  // script-derived origin. Treated as opaque by the caller; if the
  // underlying route shape ever changes, only this function's construction
  // of it changes.
  iframeUrl: string;
  stickyButtonColor: string;
  stickyButtonText: string;
  stickyPosition: EmbedStickyPosition;
  stickyTextColor: string;
  theme: EmbedTheme;
  width: number;
}

export const DEFAULT_EMBED_CONFIG = {
  buttonType: "floating" as EmbedButtonType,
  theme: "light" as EmbedTheme,
  width: 380,
  height: 560,
  accentColor: "#111111",
  floatingPosition: "bottom-right" as EmbedPosition,
  floatingIconType: "logo" as EmbedFloatingIconType,
  floatingIconUrl: null as string | null,
  stickyButtonText: "Leave Feedback",
  stickyButtonColor: "#111111",
  stickyTextColor: "#ffffff",
  stickyPosition: "right-middle" as EmbedStickyPosition,
  deviceVisibility: DEFAULT_DEVICE_VISIBILITY,
  showRoadmap: true,
  showChangelog: true,
  showSubmitFormImmediately: "auto" as EmbedSubmitTiming,
  showSimilarPosts: true,
  showViewOtherFeedbackButton: true,
};

export async function getEmbedConfig(workspaceId: string) {
  const [row] = await db
    .select()
    .from(workspaceEmbedConfig)
    .where(eq(workspaceEmbedConfig.workspaceId, workspaceId));
  return row ?? null;
}

// Backs GET /api/embed/config — resolves a workspace slug (widget.js's only
// required attribute) all the way to the fully-resolved, public-safe config
// the host-page button chrome needs. Returns null when the workspace doesn't
// exist or has no embeddable (public, non-archived) board — both are 404s to
// the caller.
export async function getWidgetHostConfig(
  workspaceSlug: string
): Promise<WidgetHostConfig | null> {
  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    return null;
  }

  const [config, allBoards] = await Promise.all([
    getEmbedConfig(workspace.id),
    listBoardsForWorkspace(workspace.id),
  ]);

  const embeddableBoards = allBoards.filter((b) => b.isPublic && !b.isArchived);
  const board = embeddableBoards[0];
  if (!board) {
    return null;
  }

  return {
    accentColor: config?.accentColor ?? DEFAULT_EMBED_CONFIG.accentColor,
    buttonType: config?.buttonType ?? DEFAULT_EMBED_CONFIG.buttonType,
    deviceVisibility:
      config?.deviceVisibility ?? DEFAULT_EMBED_CONFIG.deviceVisibility,
    floatingIconType:
      config?.floatingIconType ?? DEFAULT_EMBED_CONFIG.floatingIconType,
    floatingIconUrl:
      config?.floatingIconUrl ?? DEFAULT_EMBED_CONFIG.floatingIconUrl,
    floatingPosition:
      config?.floatingPosition ?? DEFAULT_EMBED_CONFIG.floatingPosition,
    height: config?.height ?? DEFAULT_EMBED_CONFIG.height,
    iframeUrl: `/${workspace.slug}/b/${board.slug}`,
    stickyButtonColor:
      config?.stickyButtonColor ?? DEFAULT_EMBED_CONFIG.stickyButtonColor,
    stickyButtonText:
      config?.stickyButtonText ?? DEFAULT_EMBED_CONFIG.stickyButtonText,
    stickyPosition:
      config?.stickyPosition ?? DEFAULT_EMBED_CONFIG.stickyPosition,
    stickyTextColor:
      config?.stickyTextColor ?? DEFAULT_EMBED_CONFIG.stickyTextColor,
    theme: config?.theme ?? DEFAULT_EMBED_CONFIG.theme,
    width: config?.width ?? DEFAULT_EMBED_CONFIG.width,
  };
}

export async function upsertEmbedConfig(
  workspaceId: string,
  config: {
    accentColor: string;
    buttonType: EmbedButtonType;
    deviceVisibility: EmbedDeviceVisibility;
    floatingIconType: EmbedFloatingIconType;
    floatingIconUrl: string | null;
    floatingPosition: EmbedPosition;
    height: number;
    showChangelog: boolean;
    showRoadmap: boolean;
    showSimilarPosts: boolean;
    showSubmitFormImmediately: EmbedSubmitTiming;
    showViewOtherFeedbackButton: boolean;
    stickyButtonColor: string;
    stickyButtonText: string;
    stickyPosition: EmbedStickyPosition;
    stickyTextColor: string;
    theme: EmbedTheme;
    width: number;
  }
) {
  const [row] = await db
    .insert(workspaceEmbedConfig)
    .values({ workspaceId, ...config })
    .onConflictDoUpdate({
      target: workspaceEmbedConfig.workspaceId,
      set: { ...config, updatedAt: new Date() },
    })
    .returning();
  return row!;
}
