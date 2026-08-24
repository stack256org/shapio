import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmbedDocs } from "@/components/settings/embed-docs";
import { EmbedSection } from "@/components/settings/embed-section";
import { ContentContainer } from "@/components/ui/page";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { listBoardsForWorkspace } from "@/lib/boards/queries";
import { DEFAULT_EMBED_CONFIG, getEmbedConfig } from "@/lib/embed/queries";
import { portalBaseUrl } from "@/lib/urls";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Embed — ${slug}` };
}

export default async function EmbedPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  // Workspace settings are Brand Admin only (PLATFORM.md §7).
  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    notFound();
  }

  const [config, allBoards] = await Promise.all([
    getEmbedConfig(workspace.id),
    listBoardsForWorkspace(workspace.id),
  ]);

  // The embed is anonymous/public, so only public, non-archived boards are
  // valid embed targets — there's no "all boards" public route to fall back
  // to, so at least one is required for the snippet to point at anything
  // real. The widget always embeds the first embeddable board.
  const embeddableBoards = allBoards.filter((b) => b.isPublic && !b.isArchived);

  return (
    <ContentContainer>
      <EmbedSection
        appUrl={portalBaseUrl()}
        hasEmbeddableBoard={embeddableBoards.length > 0}
        initialConfig={{
          buttonType: config?.buttonType ?? DEFAULT_EMBED_CONFIG.buttonType,
          theme: config?.theme ?? DEFAULT_EMBED_CONFIG.theme,
          width: config?.width ?? DEFAULT_EMBED_CONFIG.width,
          height: config?.height ?? DEFAULT_EMBED_CONFIG.height,
          accentColor: config?.accentColor ?? DEFAULT_EMBED_CONFIG.accentColor,
          floatingPosition:
            config?.floatingPosition ?? DEFAULT_EMBED_CONFIG.floatingPosition,
          floatingIconType:
            config?.floatingIconType ?? DEFAULT_EMBED_CONFIG.floatingIconType,
          floatingIconUrl:
            config?.floatingIconUrl ?? DEFAULT_EMBED_CONFIG.floatingIconUrl,
          stickyButtonText:
            config?.stickyButtonText ?? DEFAULT_EMBED_CONFIG.stickyButtonText,
          stickyButtonColor:
            config?.stickyButtonColor ?? DEFAULT_EMBED_CONFIG.stickyButtonColor,
          stickyTextColor:
            config?.stickyTextColor ?? DEFAULT_EMBED_CONFIG.stickyTextColor,
          stickyPosition:
            config?.stickyPosition ?? DEFAULT_EMBED_CONFIG.stickyPosition,
          deviceVisibility:
            config?.deviceVisibility ?? DEFAULT_EMBED_CONFIG.deviceVisibility,
          showRoadmap: config?.showRoadmap ?? DEFAULT_EMBED_CONFIG.showRoadmap,
          showChangelog:
            config?.showChangelog ?? DEFAULT_EMBED_CONFIG.showChangelog,
          showSubmitFormImmediately:
            config?.showSubmitFormImmediately ??
            DEFAULT_EMBED_CONFIG.showSubmitFormImmediately,
          showSimilarPosts:
            config?.showSimilarPosts ?? DEFAULT_EMBED_CONFIG.showSimilarPosts,
          showViewOtherFeedbackButton:
            config?.showViewOtherFeedbackButton ??
            DEFAULT_EMBED_CONFIG.showViewOtherFeedbackButton,
        }}
        workspaceId={workspace.id}
        workspaceSlug={slug}
      />
      <EmbedDocs appUrl={portalBaseUrl()} />
    </ContentContainer>
  );
}
