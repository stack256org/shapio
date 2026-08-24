import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EmbedNav } from "@/components/embed/embed-nav";
import { EmbedResizeReporter } from "@/components/embed/resize-reporter";
import { PoweredByBadge } from "@/components/portal/powered-by-badge";
import { ProfileActions } from "@/components/portal/profile-actions";
import { PostsTable } from "@/components/posts/posts-table";
import { SquareAvatar } from "@/components/ui/square-avatar";
import { PortalHeader } from "@/components/workspace/portal-header";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { listBoardsForWorkspace } from "@/lib/boards/queries";
import { getActiveCategoriesForWorkspace } from "@/lib/categories/queries";
import {
  buildEmbedQuery,
  embedWrapperProps,
  parseEmbedParams,
} from "@/lib/embed/style";
import { getNotificationPreferences } from "@/lib/notifications/queries";
import {
  countWorkspacePostsFiltered,
  listWorkspacePosts,
} from "@/lib/posts/queries";
import { getActiveWorkspaceStatuses } from "@/lib/workspace-statuses/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    accentColor?: string;
    board?: string;
    embed?: string;
    theme?: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `My Profile — ${slug}` };
}

export default async function PublicProfilePage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const { embed, theme, accentColor, board } = await searchParams;
  const embedParams = parseEmbedParams({ embed, theme, accentColor, board });
  const { isEmbed } = embedParams;
  const embedQuery = buildEmbedQuery(embedParams);
  const embedWrapper = embedWrapperProps(embedParams);

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const session = await getCurrentSession();
  if (!session) {
    redirect(
      `/signin?next=${encodeURIComponent(`/${slug}/profile${embedQuery}`)}`
    );
  }

  const [
    myPosts,
    postCount,
    categories,
    workspaceStatuses,
    allBoards,
    prefs,
    member,
  ] = await Promise.all([
    listWorkspacePosts(workspace.id, {
      authorId: session.user.id,
      userId: session.user.id,
      includeUnapproved: true,
      sort: "newest",
    }),
    countWorkspacePostsFiltered(workspace.id, {
      authorId: session.user.id,
      includeUnapproved: true,
    }),
    getActiveCategoriesForWorkspace(workspace.id),
    getActiveWorkspaceStatuses(workspace.id),
    listBoardsForWorkspace(workspace.id),
    getNotificationPreferences(session.user.id),
    getWorkspaceMember(workspace.id, session.user.id),
  ]);

  const publicBoards = allBoards.filter((b) => b.isPublic && !b.isArchived);
  const isMember = !!member;
  const isAdminOrOwner = !!member && member.role !== WORKSPACE_MEMBER;

  const notificationPrefs = {
    emailStatusChange: prefs?.emailStatusChange ?? true,
    emailNewComment: prefs?.emailNewComment ?? true,
    emailChangelog: prefs?.emailChangelog ?? true,
    inAppStatusChange: prefs?.inAppStatusChange ?? true,
    inAppNewComment: prefs?.inAppNewComment ?? true,
    inAppChangelog: prefs?.inAppChangelog ?? true,
  };

  const displayName = session.user.name?.trim() || session.user.email;

  return (
    <div
      className={`min-h-screen bg-ir-background ${embedWrapper.className}`}
      style={embedWrapper.style}
    >
      {isEmbed && <EmbedResizeReporter />}
      {isEmbed && (
        <EmbedNav
          active="profile"
          boards={publicBoards}
          changelogPublic={workspace.changelogPublic}
          embedQuery={embedQuery}
          feedbackBoardSlug={embedParams.board}
          isSignedIn={true}
          roadmapPublic={workspace.roadmapPublic}
          slug={slug}
        />
      )}
      {!isEmbed && (
        <PortalHeader
          boards={publicBoards}
          changelogPublic={workspace.changelogPublic}
          isMember={!!member}
          isSignedIn={true}
          logoUrl={workspace.logoUrl}
          roadmapPublic={workspace.roadmapPublic}
          slug={slug}
          userEmail={session.user.email}
          userImage={session.user.image}
          userName={session.user.name}
          workspaceName={workspace.name}
        />
      )}
      {!isEmbed && <PoweredByBadge />}

      <main
        className="mx-auto flex max-w-5xl flex-col px-4 py-8 sm:px-8"
        id="main-content"
      >
        <h1 className="mb-4 text-xl font-semibold text-ir-heading">
          My Profile
        </h1>

        <div className="flex flex-col gap-4 rounded-ir-card border border-ir-border bg-ir-surface p-5 shadow-ir-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <SquareAvatar
              alt={displayName}
              className="size-14 text-lg"
              fallback={displayName.charAt(0).toUpperCase()}
              imageUrl={session.user.image}
            />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-ir-heading">
                {displayName}
              </p>
              <p className="truncate text-sm text-ir-muted">
                {session.user.email}
              </p>
              <p className="mt-1 text-xs text-ir-muted">
                {postCount} post{postCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <ProfileActions
            email={session.user.email}
            image={session.user.image ?? null}
            name={session.user.name ?? ""}
            notificationPrefs={notificationPrefs}
          />
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-ir-heading">
            My Posts
          </h2>
          <div className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
            <PostsTable
              categories={categories}
              isAdminOrOwner={isAdminOrOwner}
              isMember={isMember}
              isSignedIn={true}
              mergedIntoHref={(post) =>
                post.mergedIntoId &&
                post.mergedIntoBoardSlug &&
                post.mergedIntoSlug
                  ? `/${slug}/b/${post.mergedIntoBoardSlug}/p/${post.mergedIntoSlug}${embedQuery}`
                  : null
              }
              postHref={(post) =>
                `/${slug}/b/${post.boardSlug}/p/${post.slug}${embedQuery}`
              }
              posts={myPosts}
              workspaceId={workspace.id}
              workspaceStatuses={workspaceStatuses}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
