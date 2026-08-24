import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmbedNav } from "@/components/embed/embed-nav";
import { EmbedResizeReporter } from "@/components/embed/resize-reporter";
import { PoweredByBadge } from "@/components/portal/powered-by-badge";
import { PortalHeader } from "@/components/workspace/portal-header";
import { getCurrentSession } from "@/lib/authz";
import { getBoardBySlug, listBoardsForWorkspace } from "@/lib/boards/queries";
import { getActiveCategoriesForWorkspace } from "@/lib/categories/queries";
import {
  buildEmbedQuery,
  embedWrapperProps,
  parseEmbedParams,
} from "@/lib/embed/style";
import { getPortalActor } from "@/lib/portal/guest-identity";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import NewPostForm from "./_components/new-post-form";

interface Props {
  params: Promise<{ slug: string; boardSlug: string }>;
  searchParams: Promise<{
    embed?: string;
    theme?: string;
    accentColor?: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, boardSlug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return { title: "New Post" };
  }
  const board = await getBoardBySlug(workspace.id, boardSlug);
  return { title: `New post — ${board?.name ?? "Board"}` };
}

export default async function NewPostPage({ params, searchParams }: Props) {
  const { slug, boardSlug } = await params;
  const { embed, theme, accentColor } = await searchParams;
  const embedParams = parseEmbedParams({ embed, theme, accentColor });
  // This page's own route param is the authoritative "current board" —
  // override whatever (if anything) was in the incoming URL so outgoing
  // links (Roadmap/Changelog nav, etc.) always carry the right one forward.
  embedParams.board = boardSlug;
  const { isEmbed } = embedParams;
  const embedQuery = buildEmbedQuery(embedParams);
  const embedWrapper = embedWrapperProps(embedParams);

  // The form renders for everyone, identified or not. Identity is established
  // in place at SUBMIT time — accountless email verification on the Public
  // Portal, account sign-in inside the embed — so a visitor never loses a
  // draft to a redirect and never meets a sign-up wall before they have even
  // started typing.
  const session = await getCurrentSession();
  const actor = await getPortalActor();
  const canParticipate = !!actor;

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const board = await getBoardBySlug(workspace.id, boardSlug);
  if (!board) {
    notFound();
  }

  const member = session
    ? await getWorkspaceMember(workspace.id, session.user.id)
    : null;

  // Anyone signed in may submit on a public board; private/archived boards are
  // restricted to workspace members. A signed-out embed guest is treated the
  // same as any other non-member for this check.
  if ((!board.isPublic || board.isArchived) && !member) {
    notFound();
  }

  const [categories, allBoards] = await Promise.all([
    getActiveCategoriesForWorkspace(workspace.id),
    listBoardsForWorkspace(workspace.id),
  ]);
  const publicBoards = allBoards.filter((b) => b.isPublic && !b.isArchived);

  return (
    <div
      className={`min-h-screen bg-ir-background ${embedWrapper.className}`}
      style={embedWrapper.style}
    >
      {isEmbed && <EmbedResizeReporter />}
      {isEmbed && (
        <EmbedNav
          active="feedback"
          boards={publicBoards}
          changelogPublic={workspace.changelogPublic}
          embedQuery={embedQuery}
          feedbackBoardSlug={boardSlug}
          isSignedIn={!!session}
          roadmapPublic={workspace.roadmapPublic}
          slug={slug}
        />
      )}
      {!isEmbed && (
        <PortalHeader
          boards={publicBoards}
          changelogPublic={workspace.changelogPublic}
          guestEmail={actor && !actor.id ? actor.email : undefined}
          guestName={actor && !actor.id ? actor.name : undefined}
          isMember={!!member}
          isSignedIn={!!session}
          logoUrl={workspace.logoUrl}
          roadmapPublic={workspace.roadmapPublic}
          slug={slug}
          userEmail={session?.user.email}
          userImage={session?.user.image}
          userName={session?.user.name}
          workspaceName={workspace.name}
        />
      )}
      {!isEmbed && <PoweredByBadge />}
      <main className="mx-auto max-w-5xl" id="main-content">
        <NewPostForm
          boardId={board.id}
          boardName={board.name}
          boardSlug={boardSlug}
          categories={categories}
          embedQuery={embedQuery}
          isEmbed={isEmbed}
          isSignedIn={canParticipate}
          workspaceId={workspace.id}
          workspaceSlug={slug}
        />
      </main>
    </div>
  );
}
