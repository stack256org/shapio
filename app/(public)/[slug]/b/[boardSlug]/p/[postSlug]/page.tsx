import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmbedNav } from "@/components/embed/embed-nav";
import { EmbedResizeReporter } from "@/components/embed/resize-reporter";
import { EmbedModalHeader } from "@/components/embed/widget/embed-modal-header";
import { PoweredByBadge } from "@/components/portal/powered-by-badge";
import { PostDetailContent } from "@/components/posts/post-detail-content";
import { PortalHeader } from "@/components/workspace/portal-header";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { getPostMergeAudit } from "@/lib/audit/queries";
import { getCurrentSession } from "@/lib/authz";
import {
  getBoardById,
  getBoardBySlug,
  listBoardsForWorkspace,
} from "@/lib/boards/queries";
import { getActiveCategoriesForWorkspace } from "@/lib/categories/queries";
import { EmbedPersonalizationProvider } from "@/lib/embed/personalization-context";
import {
  buildEmbedQuery,
  embedWrapperProps,
  parseEmbedParams,
} from "@/lib/embed/style";
import { resolveBackTarget } from "@/lib/navigation/back-target";
import { getPortalActor } from "@/lib/portal/guest-identity";
import { getPost, getPostBySlug, listStatusHistory } from "@/lib/posts/queries";
import { hasUserVoted } from "@/lib/voting";
import { getActiveWorkspaceStatuses } from "@/lib/workspace-statuses/queries";
import { listMembers } from "@/lib/workspaces/members";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string; boardSlug: string; postSlug: string }>;
  searchParams: Promise<{
    embed?: string;
    theme?: string;
    accentColor?: string;
    from?: string;
    fromLabel?: string;
    layout?: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, boardSlug, postSlug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return { title: "Post" };
  }
  const board = await getBoardBySlug(workspace.id, boardSlug);
  if (!board) {
    return { title: "Post" };
  }
  const post = await getPostBySlug(board.id, postSlug);
  return { title: post?.title ?? "Post" };
}

export default async function PostDetailPage({ params, searchParams }: Props) {
  const { slug, boardSlug, postSlug } = await params;
  const { embed, theme, accentColor, from, fromLabel, layout } =
    await searchParams;
  const embedParams = parseEmbedParams({ embed, theme, accentColor, layout });
  // This page's own route param is the authoritative "current board" —
  // override whatever (if anything) was in the incoming URL so outgoing
  // links (Roadmap/Changelog nav, etc.) always carry the right one forward.
  embedParams.board = boardSlug;
  const { isEmbed, isPanel } = embedParams;
  const embedQuery = buildEmbedQuery(embedParams);
  const embedWrapper = embedWrapperProps(embedParams);

  const session = await getCurrentSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const member = session
    ? await getWorkspaceMember(workspace.id, session.user.id)
    : null;
  const isSignedIn = !!session;

  // A signed-in account OR an accountless visitor who has verified their
  // email. Voting and commenting key off this; member-only affordances
  // (moderation, assignment, edit/delete) stay on isSignedIn/isMember.
  const actor = await getPortalActor();
  const canParticipate = !!actor;
  const isMember = !!member;

  const board = await getBoardBySlug(workspace.id, boardSlug);
  if (!board) {
    notFound();
  }

  // Private boards are members-only. Archived boards stay publicly readable
  // (read-only — voting is disabled via the board's archived flag).
  if (!board.isPublic && !isMember) {
    notFound();
  }

  const post = await getPostBySlug(board.id, postSlug);
  if (!post) {
    notFound();
  }

  // Unpublished drafts never appear on the public portal — they are managed
  // from the admin feedback view until published.
  if (post.isDraft) {
    notFound();
  }

  // Hidden/unapproved feedback never appears on the public portal — not even
  // to a signed-in workspace member/admin. Visibility must not depend on the
  // viewer's identity; direct URLs to hidden posts always 404 here.
  if (!post.isApproved) {
    notFound();
  }

  const workspaceStatuses = await getActiveWorkspaceStatuses(workspace.id);

  const isAdminOrOwner = !!member && member.role !== WORKSPACE_MEMBER;

  const [votedByUser, categories, statusHistory, allBoards, members] =
    await Promise.all([
      // Guests are matched by verified email — without this their own vote
      // would render as un-cast and a second click would look like an un-vote.
      actor
        ? hasUserVoted(post.id, {
            userId: actor.id ?? undefined,
            userEmail: actor.id ? undefined : actor.email,
          })
        : false,
      getActiveCategoriesForWorkspace(workspace.id),
      listStatusHistory(post.id),
      listBoardsForWorkspace(workspace.id),
      isMember ? listMembers(workspace.id) : Promise.resolve([]),
    ]);

  const publicBoards = allBoards.filter((b) => b.isPublic && !b.isArchived);
  const assignees = members.map((m) => ({
    id: m.userId,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
  }));

  // If this post was merged into another, resolve the target's URL plus
  // who/when the merge happened (from the audit log) for the notice.
  let mergedTarget: {
    href: string;
    mergedAt: Date | null;
    mergedByEmail: string | null;
    mergedByName: string | null;
    title: string;
  } | null = null;
  if (post.mergedIntoId) {
    const [target, mergeAudit] = await Promise.all([
      getPost(post.mergedIntoId),
      getPostMergeAudit(post.id),
    ]);
    const targetBoard = target ? await getBoardById(target.boardId) : null;
    if (target && targetBoard) {
      mergedTarget = {
        title: target.title,
        href: `/${slug}/b/${targetBoard.slug}/p/${target.slug}${embedQuery}`,
        mergedAt: mergeAudit?.mergedAt ?? null,
        mergedByName: mergeAudit?.actorName ?? null,
        mergedByEmail: mergeAudit?.actorEmail ?? null,
      };
    }
  }

  // Back returns to wherever the user came from (e.g. the Roadmap) when a valid
  // `from` is supplied; otherwise it falls back to this post's board.
  const back = resolveBackTarget({
    from,
    fromLabel,
    fallbackHref: `/${slug}/b/${boardSlug}${embedQuery}`,
    fallbackLabel: board.name,
  });

  return (
    <EmbedPersonalizationProvider
      includeCommentOwnership
      includeModerator
      isEmbed={isEmbed}
      postIds={[post.id]}
      workspaceId={workspace.id}
    >
      <div
        className={`${
          isPanel ? "flex h-dvh flex-col overflow-hidden" : "min-h-screen"
        } bg-ir-background ${embedWrapper.className}`}
        style={embedWrapper.style}
      >
        {isEmbed && !isPanel && <EmbedResizeReporter />}
        {isEmbed && isPanel && (
          <EmbedModalHeader backHref={back.href} title={post.title} />
        )}
        {isEmbed && !isPanel && (
          <EmbedNav
            active="feedback"
            boards={publicBoards}
            changelogPublic={workspace.changelogPublic}
            embedQuery={embedQuery}
            feedbackBoardSlug={boardSlug}
            isSignedIn={isSignedIn}
            roadmapPublic={workspace.roadmapPublic}
            slug={slug}
          />
        )}
        {!isEmbed && (
          <PortalHeader
            boards={publicBoards}
            changelogPublic={workspace.changelogPublic}
            currentPath={`/${slug}/b/${boardSlug}/p/${postSlug}${embedQuery}`}
            guestEmail={actor && !actor.id ? actor.email : undefined}
            guestName={actor && !actor.id ? actor.name : undefined}
            isMember={isMember}
            isSignedIn={isSignedIn}
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

        <main
          className={isPanel ? "min-h-0 flex-1 overflow-y-auto" : ""}
          id="main-content"
        >
          <PostDetailContent
            assignees={assignees}
            backLabel={back.label}
            boardHref={back.href}
            boardIsArchived={board.isArchived}
            canParticipate={canParticipate}
            categories={categories}
            currentUserId={session?.user.id ?? null}
            embedQuery={embedQuery}
            isAdminOrOwner={isAdminOrOwner}
            isEmbed={isEmbed}
            isMember={isMember}
            isPublicPortal
            isSignedIn={isSignedIn}
            mergedTarget={mergedTarget}
            post={post}
            statusHistory={statusHistory}
            votedByUser={votedByUser}
            workspaceId={workspace.id}
            workspaceStatuses={workspaceStatuses}
          />
        </main>
      </div>
    </EmbedPersonalizationProvider>
  );
}
