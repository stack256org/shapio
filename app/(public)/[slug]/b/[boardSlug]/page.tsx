import { ChatCircleIcon, PushPinIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryChip } from "@/components/categories/category-chip";
import { EmbedNav } from "@/components/embed/embed-nav";
import { EmbedResizeReporter } from "@/components/embed/resize-reporter";
import { EmbedWidgetShell } from "@/components/embed/widget/embed-widget-shell";
import { CategorySidebar } from "@/components/portal/category-sidebar";
import { NewFeedbackButton } from "@/components/portal/new-feedback-button";
import { PoweredByBadge } from "@/components/portal/powered-by-badge";
import { PostStatusBadge } from "@/components/posts/post-status-badge";
import { PostsPagination } from "@/components/posts/posts-pagination";
import { RelativeTime } from "@/components/ui/relative-time";
import VoteButton from "@/components/voting/vote-button";
import { PortalHeader } from "@/components/workspace/portal-header";
import { getCurrentSession } from "@/lib/authz";
import { getBoardBySlug, listBoardsForWorkspace } from "@/lib/boards/queries";
import { getActiveCategoriesForWorkspace } from "@/lib/categories/queries";
import { truncateHtmlToText } from "@/lib/changelog/html";
import { EmbedPersonalizationProvider } from "@/lib/embed/personalization-context";
import { DEFAULT_EMBED_CONFIG, getEmbedConfig } from "@/lib/embed/queries";
import {
  buildEmbedQuery,
  embedWrapperProps,
  parseEmbedParams,
} from "@/lib/embed/style";
import { getPortalActor } from "@/lib/portal/guest-identity";
import { countBoardPostsFiltered, listBoardPosts } from "@/lib/posts/queries";
import { getActiveWorkspaceStatuses } from "@/lib/workspace-statuses/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import BoardFilters from "./_components/board-filters";

interface Props {
  params: Promise<{ slug: string; boardSlug: string }>;
  searchParams: Promise<{
    sort?: string;
    status?: string;
    category?: string;
    q?: string;
    myVotes?: string;
    mine?: string;
    page?: string;
    embed?: string;
    layout?: string;
    theme?: string;
    accentColor?: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, boardSlug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return { title: "Board" };
  }
  const board = await getBoardBySlug(workspace.id, boardSlug);
  return { title: board?.name ?? "Board" };
}

export default async function BoardPage({ params, searchParams }: Props) {
  const { slug, boardSlug } = await params;
  const {
    sort,
    status,
    category,
    q,
    myVotes,
    mine,
    page,
    embed,
    layout,
    theme,
    accentColor,
  } = await searchParams;
  const embedParams = parseEmbedParams({ accentColor, embed, layout, theme });
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
  const isMember = !!member;

  // A signed-in account OR an accountless visitor who has already verified
  // their email. Participation affordances (vote, submit, comment, the "my
  // votes"/"my posts" filters) key off this; member-only affordances still
  // key off isSignedIn/isMember.
  const actor = await getPortalActor();
  const canParticipate = !!actor;
  // Only set for a guest — an account is identified by id, not email.
  const guestEmail = actor && !actor.id ? actor.email : undefined;
  const guestName = actor && !actor.id ? actor.name : undefined;

  const board = await getBoardBySlug(workspace.id, boardSlug);
  if (!board) {
    notFound();
  }

  // Private boards are visible to workspace members only. Archived boards stay
  // publicly readable (read-only) — they show a notice and don't accept new
  // feedback (see below).
  if (!board.isPublic && !isMember) {
    notFound();
  }

  const validSort =
    sort === "top" ? "top" : sort === "trending" ? "trending" : "newest";
  const validStatus = status ?? "";
  const validCategoryId = category ?? "";
  const searchQuery = q ?? "";
  const myVotesActive = canParticipate && myVotes === "true";
  const mineActive = canParticipate && mine === "1";
  const PAGE_SIZE = 20;
  const currentPage = Math.max(1, Number(page ?? 1));

  const [workspaceStatuses, categories, allBoards] = await Promise.all([
    getActiveWorkspaceStatuses(workspace.id),
    getActiveCategoriesForWorkspace(workspace.id),
    listBoardsForWorkspace(workspace.id),
  ]);

  // Panel mode (the widget's Floating/Sticky button) never shows the board's
  // feedback list — it's a creation-only modal (Categories -> Form ->
  // Success). Returning here also skips the post-listing queries below,
  // which this view has no use for.
  if (isPanel) {
    // Widget-level behavior settings — never travel through widget.js or
    // the iframe query string, just read straight from the DB inside this
    // same request, same as embedWrapper's theme/accent above are not (see
    // lib/embed/queries.ts's getWidgetHostConfig for the host-chrome half
    // of this config, which *does* travel to widget.js).
    const embedConfig = await getEmbedConfig(workspace.id);
    return (
      <EmbedWidgetShell
        boardId={board.id}
        boardName={board.name}
        boardSlug={board.slug}
        categories={categories}
        embedQuery={embedQuery}
        isSignedIn={isSignedIn}
        showChangelog={
          workspace.changelogPublic &&
          (embedConfig?.showChangelog ?? DEFAULT_EMBED_CONFIG.showChangelog)
        }
        showRoadmap={
          workspace.roadmapPublic &&
          (embedConfig?.showRoadmap ?? DEFAULT_EMBED_CONFIG.showRoadmap)
        }
        showSimilarPosts={
          embedConfig?.showSimilarPosts ?? DEFAULT_EMBED_CONFIG.showSimilarPosts
        }
        showViewOtherFeedbackButton={
          embedConfig?.showViewOtherFeedbackButton ??
          DEFAULT_EMBED_CONFIG.showViewOtherFeedbackButton
        }
        submitFormTiming={
          embedConfig?.showSubmitFormImmediately ??
          DEFAULT_EMBED_CONFIG.showSubmitFormImmediately
        }
        workspaceId={workspace.id}
        workspaceSlug={slug}
        wrapperClassName={embedWrapper.className}
        wrapperStyle={embedWrapper.style}
      />
    );
  }

  // Statuses an admin has marked "hidden from public feed" (Completed, by
  // default) are excluded here only — the admin panel's own post lists never
  // apply this filter.
  const excludeStatuses = workspaceStatuses
    .filter((s) => !s.showOnPublicFeed)
    .map((s) => s.slug);
  // Same exclusion for the status filter dropdown, so visitors can't select a
  // status that would always return zero results.
  const publicWorkspaceStatuses = workspaceStatuses.filter(
    (s) => s.showOnPublicFeed
  );

  // Shared filter set for the page query and its matching count.
  // Hidden/unapproved posts never appear on the public portal, regardless of
  // whether the viewer is signed in as a workspace member/admin — visibility
  // must not depend on who happens to be looking. Team members review
  // moderation-held posts from the workspace app, not this public route.
  const filterOpts = {
    status: validStatus || undefined,
    categoryId: validCategoryId || undefined,
    search: searchQuery || undefined,
    userId: session?.user.id,
    guestEmail,
    myVotes: myVotesActive,
    onlyMine: mineActive,
    includeUnapproved: false,
    excludeStatuses,
  };

  const [boardPosts, totalCount] = await Promise.all([
    listBoardPosts(board.id, {
      sort: validSort,
      ...filterOpts,
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    }),
    countBoardPostsFiltered(board.id, filterOpts),
  ]);

  // Build a category map for quick lookup
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const publicBoards = allBoards.filter((b) => b.isPublic && !b.isArchived);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalCount);

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (validSort !== "newest") {
      params.set("sort", validSort);
    }
    if (validStatus) {
      params.set("status", validStatus);
    }
    if (validCategoryId) {
      params.set("category", validCategoryId);
    }
    if (searchQuery) {
      params.set("q", searchQuery);
    }
    if (myVotesActive) {
      params.set("myVotes", "true");
    }
    if (mineActive) {
      params.set("mine", "1");
    }
    if (embed) {
      params.set("embed", embed);
    }
    if (layout) {
      params.set("layout", layout);
    }
    if (theme) {
      params.set("theme", theme);
    }
    if (accentColor) {
      params.set("accentColor", accentColor);
    }
    if (targetPage > 1) {
      params.set("page", String(targetPage));
    }
    const qs = params.toString();
    return `/${slug}/b/${boardSlug}${qs ? `?${qs}` : ""}`;
  }

  // Always go straight to the form. Both the embed and the Public Portal
  // handle an unidentified visitor in place (verify at submit time) rather
  // than bouncing them to /signin before they can even start typing.
  const newPostHref = board.isArchived
    ? undefined
    : `/${slug}/b/${boardSlug}/new${embedQuery}`;

  return (
    <EmbedPersonalizationProvider
      isEmbed={isEmbed}
      postIds={boardPosts.map((p) => p.id)}
      workspaceId={workspace.id}
    >
      <div
        className={`${
          isPanel ? "flex h-dvh flex-col overflow-hidden" : "min-h-screen"
        } bg-ir-background ${embedWrapper.className}`}
        style={embedWrapper.style}
      >
        {/* Panel mode (the widget's floating launcher) is a fixed-size iframe
            with its own internal scroll region below — growing to fit content
            would just get clipped by the panel, so there's nothing to report. */}
        {isEmbed && !isPanel && <EmbedResizeReporter />}
        {isEmbed && (
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
            currentPath={`/${slug}/b/${boardSlug}${embedQuery}`}
            guestEmail={guestEmail}
            guestName={guestName}
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
          {/* Page header — pinned in panel mode so only the content below scrolls */}
          <div
            className={`border-b border-ir-border px-4 py-6 sm:px-8 ${isPanel ? "shrink-0" : ""}`}
          >
            <h1 className="text-xl font-semibold text-ir-heading">
              {board.name}
            </h1>
            {board.description && (
              <p className="mt-1 text-sm text-ir-muted">{board.description}</p>
            )}
            {board.isArchived && (
              <p className="mt-3 rounded-ir-sm border-l-2 border-ir-warning bg-ir-warning/10 py-1.5 pl-3 text-xs text-ir-muted">
                This board is archived and no longer accepting new feedback. Its
                posts remain readable below.
              </p>
            )}
          </div>

          <div
            className={`flex flex-col gap-6 px-4 py-6 sm:px-8 lg:flex-row lg:items-start lg:gap-8 ${
              isPanel
                ? "min-h-0 flex-1 overflow-y-scroll [scrollbar-gutter:stable]"
                : ""
            }`}
          >
            {/* Main content */}
            <div className="min-w-0 flex-1 rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
              <BoardFilters
                activeSearch={searchQuery}
                activeSort={validSort}
                activeStatus={validStatus}
                myVotesActive={myVotesActive}
                showMyVotes={canParticipate}
                workspaceStatuses={publicWorkspaceStatuses}
              />

              {/* Post list */}
              {boardPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-24 text-center sm:px-8">
                  {searchQuery ||
                  validStatus ||
                  validCategoryId ||
                  myVotesActive ||
                  mineActive ? (
                    <>
                      <p className="text-sm font-medium text-ir-heading">
                        No posts match your filters
                      </p>
                      <p className="mt-1 text-xs text-ir-muted">
                        Try a different search term, status, or category.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-ir-heading">
                        No feedback yet
                      </p>
                      <p className="mt-1 text-xs text-ir-muted">
                        Be the first to submit an idea or request.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-ir-border">
                  {boardPosts.map((post) => {
                    const postCategory = post.categoryId
                      ? categoryMap.get(post.categoryId)
                      : undefined;

                    return (
                      <div
                        className="group flex items-start gap-3 px-4 py-5 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface sm:px-6"
                        key={post.id}
                      >
                        {/* Post content */}
                        <Link
                          className="min-w-0 flex-1"
                          href={`/${slug}/b/${boardSlug}/p/${post.slug}${embedQuery}`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            {post.isPinned && (
                              <PushPinIcon
                                className="size-3 shrink-0 text-ir-primary"
                                weight="fill"
                              />
                            )}
                            <p className="text-sm font-medium text-ir-heading transition-colors duration-150 ease-ir-standard group-hover:text-ir-primary">
                              {post.title}
                            </p>
                          </div>
                          {post.body && (
                            <p className="mt-1 line-clamp-2 text-xs text-ir-muted">
                              {truncateHtmlToText(post.body, 240)}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            {postCategory && (
                              <CategoryChip
                                color={postCategory.color}
                                name={postCategory.name}
                                size="xs"
                              />
                            )}
                            <PostStatusBadge
                              status={post.status}
                              workspaceStatuses={workspaceStatuses}
                            />
                            <span className="text-xs text-ir-muted">
                              {/* Name only — this board is public, and the
                                  verified address behind an accountless post
                                  is not the visitor's to publish. */}
                              {post.authorName?.trim() || "User"} ·{" "}
                              <RelativeTime
                                date={post.createdAt}
                                options={{ addSuffix: true }}
                              />
                            </span>
                            {post.commentCount > 0 && (
                              <span className="flex items-center gap-1 text-xs text-ir-muted">
                                <ChatCircleIcon className="size-3" />
                                {post.commentCount}
                              </span>
                            )}
                          </div>
                        </Link>

                        {/* Vote control */}
                        <div className="shrink-0">
                          <VoteButton
                            compact
                            initialCount={post.upvotes}
                            initialHasVoted={post.hasVoted}
                            isArchived={board.isArchived}
                            isSignedIn={canParticipate}
                            postId={post.id}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination — numbered, shown only when there's more than one page */}
              {totalPages > 1 && (
                <div className="flex flex-col-reverse items-center justify-between gap-3 border-t border-ir-border px-4 py-3 sm:flex-row sm:px-6">
                  <span className="text-xs text-ir-muted">
                    Showing {rangeStart.toLocaleString()}–
                    {rangeEnd.toLocaleString()} of {totalCount.toLocaleString()}
                  </span>
                  <PostsPagination
                    currentPage={currentPage}
                    hrefForPage={pageHref}
                    totalPages={totalPages}
                  />
                </div>
              )}
            </div>

            {/* Sidebar — in panel mode its own "+ Feedback" button is
                suppressed in favor of the pinned footer below, so the CTA
                stays reachable without scrolling through the post list. */}
            <CategorySidebar
              activeCategoryId={validCategoryId}
              activeSearch={searchQuery}
              activeSort={validSort}
              activeStatus={validStatus}
              boardSlug={boardSlug}
              categories={categories}
              embedQuery={embedQuery}
              isMine={mineActive}
              isSignedIn={canParticipate}
              newPostHref={isPanel ? undefined : newPostHref}
              slug={slug}
            />
          </div>

          {/* Pinned footer — panel mode only; the standalone page keeps the
              "+ Feedback" button in the sidebar above instead. */}
          {isPanel && newPostHref && (
            <div className="shrink-0 border-t border-ir-border bg-ir-surface px-4 py-3 sm:px-8">
              <NewFeedbackButton href={newPostHref} />
            </div>
          )}
        </main>
      </div>
    </EmbedPersonalizationProvider>
  );
}
