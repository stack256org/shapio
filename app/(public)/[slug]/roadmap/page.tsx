import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmbedNav } from "@/components/embed/embed-nav";
import { EmbedResizeReporter } from "@/components/embed/resize-reporter";
import { EmbedModalHeader } from "@/components/embed/widget/embed-modal-header";
import { NewFeedbackButton } from "@/components/portal/new-feedback-button";
import { PoweredByBadge } from "@/components/portal/powered-by-badge";
import {
  type BoardStatus,
  ManualRoadmapBoard,
} from "@/components/roadmap/manual/manual-roadmap-board";
import type { BoardItem } from "@/components/roadmap/manual/manual-roadmap-card";
import { ManualRoadmapProvider } from "@/components/roadmap/manual/manual-roadmap-search-context";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { PortalHeader } from "@/components/workspace/portal-header";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { listBoardsForWorkspace } from "@/lib/boards/queries";
import { getActiveCategoriesForWorkspace } from "@/lib/categories/queries";
import { EmbedPersonalizationProvider } from "@/lib/embed/personalization-context";
import {
  buildEmbedQuery,
  embedWrapperProps,
  parseEmbedParams,
} from "@/lib/embed/style";
import { getGuestIdentity } from "@/lib/portal/guest-identity";
import { getDerivedRoadmap } from "@/lib/roadmap/derived";
import { getManualRoadmap } from "@/lib/roadmap/manual";
import type { RoadmapSort } from "@/lib/roadmap/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import { RoadmapFilters } from "./_components/roadmap-filters";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    accentColor?: string;
    board?: string;
    category?: string;
    embed?: string;
    layout?: string;
    q?: string;
    sort?: string;
    theme?: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return { title: "Roadmap" };
  }
  return {
    title: `Roadmap — ${workspace.name}`,
    robots: workspace.roadmapPublic ? "index, follow" : "noindex, nofollow",
  };
}

export default async function RoadmapPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { category, q, sort, embed, layout, theme, accentColor, board } =
    await searchParams;
  const embedParams = parseEmbedParams({
    accentColor,
    board,
    embed,
    layout,
    theme,
  });
  const { isEmbed, isPanel } = embedParams;
  const embedQuery = buildEmbedQuery(embedParams);
  const embedWrapper = embedWrapperProps(embedParams);

  const session = await getCurrentSession();
  // Read-only here — the roadmap has no accountless participation of its own,
  // but a visitor who verified on a board must not look signed-out when they
  // navigate here.
  const guest = session ? null : await getGuestIdentity();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const member = session
    ? await getWorkspaceMember(workspace.id, session.user.id)
    : null;
  const isSignedIn = !!session;
  const isMember = !!member;
  // Drag-to-retriage on the public portal: gated at the same thresholds as
  // the internal /settings/roadmap board — any workspace member for the
  // synced board (triage is a fixed Team Member permission, PLATFORM.md §4),
  // admin-only for the manual board (matches the existing manual-roadmap
  // curation threshold). Server actions re-check membership independently,
  // this only controls whether the drag affordance renders.
  const isAdmin = member ? member.role !== WORKSPACE_MEMBER : false;

  // When the roadmap is private it appears not to exist for non-members.
  if (!workspace.roadmapPublic && !isMember) {
    notFound();
  }

  const syncEnabled = workspace.roadmapSyncEnabled;
  const validCategoryId = category ?? "";
  const searchQuery = q ?? "";
  const validSort: RoadmapSort =
    sort === "latest_status_change" ? "latest_status_change" : "votes";

  const [derivedColumns, manual, allBoards, categories] = await Promise.all([
    syncEnabled
      ? getDerivedRoadmap(workspace.id, {
          // Fixed `false` on this public route — hidden posts and
          // private-board items must never surface here, even for a
          // signed-in workspace admin. Admins review those from
          // /settings/roadmap instead.
          isAdmin: false,
          userId: session?.user.id,
          categoryId: validCategoryId || undefined,
          search: searchQuery || undefined,
          sort: validSort,
        })
      : Promise.resolve([]),
    syncEnabled ? Promise.resolve(null) : getManualRoadmap(workspace.id),
    listBoardsForWorkspace(workspace.id),
    getActiveCategoriesForWorkspace(workspace.id),
  ]);

  const publicBoards = allBoards.filter((b) => b.isPublic && !b.isArchived);
  const activeBoards = allBoards.filter((b) => !b.isArchived);

  const manualStatuses: BoardStatus[] = (manual?.columns ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    itemCount: c.items.length,
  }));
  const manualItems: BoardItem[] = (manual?.columns ?? []).flatMap((c) =>
    c.items.map((i) => ({
      id: i.id,
      statusId: i.statusId,
      title: i.title,
      description: i.description,
      launchDate: i.launchDate ? i.launchDate.toISOString() : null,
      coverImage: i.coverImage,
      voteCount: i.voteCount,
      commentCount: i.commentCount,
      feedbackId: i.feedbackId,
    }))
  );

  const totalPosts = syncEnabled
    ? derivedColumns.reduce((n, c) => n + c.posts.length, 0)
    : manualItems.length;

  // The public portal never redirects into the workspace app — everyone here
  // (including signed-in members browsing the public roadmap) goes through
  // the public submission flow. Always go straight to the form: both the
  // embed and the Public Portal resolve identity in place at submit time
  // rather than bouncing anyone to /signin before they can start typing.
  // Prefer the board this embed instance is configured for (if it's still a
  // valid target) over an arbitrary first board, so "+ Feedback" from the
  // embedded roadmap submits to the same board the widget shows elsewhere.
  const feedbackBoard =
    activeBoards.find((b) => b.slug === embedParams.board) ?? activeBoards[0];
  const feedbackHref = feedbackBoard
    ? `/${slug}/b/${feedbackBoard.slug}/new${embedQuery}`
    : null;
  // Inside the widget's modal (panel mode), "new post" isn't a separate page
  // at all — it's the Categories/Form/Success shell living on the board
  // route itself, so "+ Feedback" from here goes there instead of /new.
  const panelFeedbackHref = feedbackBoard
    ? `/${slug}/b/${feedbackBoard.slug}${embedQuery}`
    : null;

  return (
    <EmbedPersonalizationProvider
      isEmbed={isEmbed}
      postIds={derivedColumns.flatMap((c) => c.posts.map((p) => p.id))}
      workspaceId={workspace.id}
    >
      <div
        className={`${
          isPanel ? "flex h-dvh flex-col overflow-hidden" : "min-h-screen"
        } bg-ir-background ${embedWrapper.className}`}
        style={embedWrapper.style}
      >
        {isEmbed && !isPanel && <EmbedResizeReporter />}
        {isEmbed && isPanel && feedbackBoard && (
          <EmbedModalHeader
            backHref={`/${slug}/b/${feedbackBoard.slug}${embedQuery}`}
            title="Roadmap"
          />
        )}
        {isEmbed && !isPanel && (
          <EmbedNav
            active="roadmap"
            boards={publicBoards}
            changelogPublic={workspace.changelogPublic}
            embedQuery={embedQuery}
            feedbackBoardSlug={embedParams.board}
            isSignedIn={isSignedIn}
            roadmapPublic={workspace.roadmapPublic}
            slug={slug}
          />
        )}
        {!isEmbed && (
          <PortalHeader
            active="roadmap"
            boards={publicBoards}
            changelogPublic={workspace.changelogPublic}
            currentPath={`/${slug}/roadmap`}
            guestEmail={guest?.email}
            guestName={guest?.name}
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
          className={
            isPanel
              ? "mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden"
              : "mx-auto flex max-w-5xl flex-col"
          }
          id="main-content"
        >
          {!isPanel && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ir-border px-4 py-6 sm:px-8">
              <div>
                <h1 className="text-xl font-semibold text-ir-heading">
                  Roadmap
                </h1>
                <p className="mt-1 text-sm text-ir-muted">
                  {totalPosts === 0
                    ? "No items on the roadmap yet."
                    : `${totalPosts} item${totalPosts === 1 ? "" : "s"} across all columns`}
                </p>
              </div>
              {feedbackHref && (
                <NewFeedbackButton className="" href={feedbackHref} />
              )}
            </div>
          )}

          <div
            className={
              isPanel
                ? "flex min-h-0 flex-1 flex-col overflow-y-auto"
                : "contents"
            }
          >
            {syncEnabled ? (
              <>
                <RoadmapFilters
                  activeCategoryId={validCategoryId}
                  activeSearch={searchQuery}
                  activeSort={validSort}
                  categories={categories}
                />
                <div className="flex-1">
                  <RoadmapBoard
                    canManage={isMember}
                    columns={derivedColumns}
                    embedQuery={embedQuery}
                    isFiltering={!!(validCategoryId || searchQuery)}
                    isSignedIn={isSignedIn}
                    workspaceId={workspace.id}
                    workspaceSlug={slug}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1">
                {/* The public portal never gets full item management (add/
                edit/delete/manage-columns stay workspace-only, canManage
                false) — but a signed-in admin can still drag a card to
                retriage it, same as /settings/roadmap. The board still reads
                its (unused, since canManage is false) manage/add controls
                from this context internally, so it needs a provider here too
                even though the public page never renders the search/manage/
                add trigger buttons that normally supply it. */}
                <ManualRoadmapProvider>
                  <ManualRoadmapBoard
                    canDrag={isAdmin}
                    canManage={false}
                    items={manualItems}
                    statuses={manualStatuses}
                    workspaceId={workspace.id}
                  />
                </ManualRoadmapProvider>
              </div>
            )}
          </div>

          {isPanel && panelFeedbackHref && (
            <div className="shrink-0 border-t border-ir-border bg-ir-surface px-4 py-3 sm:px-8">
              <NewFeedbackButton href={panelFeedbackHref} />
            </div>
          )}
        </main>
      </div>
    </EmbedPersonalizationProvider>
  );
}
