import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { format } from "date-fns";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChangelogCommentSection } from "@/components/changelog/changelog-comment-section";
import { ChangelogLabelBadge } from "@/components/changelog/changelog-label-badge";
import { ChangelogReactions } from "@/components/changelog/changelog-reactions";
import { ChangelogRenderedBody } from "@/components/changelog/changelog-rendered-body";
import { ChangelogShareButton } from "@/components/changelog/changelog-share-button";
import { EmbedNav } from "@/components/embed/embed-nav";
import { EmbedResizeReporter } from "@/components/embed/resize-reporter";
import { EmbedModalHeader } from "@/components/embed/widget/embed-modal-header";
import { PoweredByBadge } from "@/components/portal/powered-by-badge";
import { ImagePreviewThumbnail } from "@/components/ui/image-preview-thumbnail";
import VoteButton from "@/components/voting/vote-button";
import { PortalHeader } from "@/components/workspace/portal-header";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import { listBoardsForWorkspace } from "@/lib/boards/queries";
import { sanitizeChangelogHtml } from "@/lib/changelog/html";
import { getChangelogEntryById } from "@/lib/changelog/queries";
import { getReactionsForEntry } from "@/lib/changelog-comments/reactions";
import { EmbedPersonalizationProvider } from "@/lib/embed/personalization-context";
import {
  buildEmbedQuery,
  embedWrapperProps,
  parseEmbedParams,
} from "@/lib/embed/style";
import { getGuestIdentity } from "@/lib/portal/guest-identity";
import { portalBaseUrl } from "@/lib/urls";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string; entryId: string }>;
  searchParams: Promise<{
    accentColor?: string;
    board?: string;
    embed?: string;
    layout?: string;
    theme?: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, entryId } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return { title: "Changelog" };
  }

  const entry = await getChangelogEntryById(entryId, workspace.id);
  if (!entry?.isPublished) {
    return { title: "Changelog", robots: "noindex" };
  }

  const appUrl = portalBaseUrl();
  const title = `${entry.title} — ${workspace.name} Changelog`;

  return {
    title,
    openGraph: {
      title,
      url: `${appUrl}/${slug}/changelog/${entryId}`,
      type: "article",
    },
    robots: workspace.changelogPublic ? "index, follow" : "noindex, nofollow",
  };
}

export default async function PublicChangelogEntryPage({
  params,
  searchParams,
}: Props) {
  const { slug, entryId } = await params;
  const { embed, theme, accentColor, board, layout } = await searchParams;
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

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const session = await getCurrentSession();
  // Read-only — keeps a visitor who verified on a board from appearing
  // signed-out when they navigate here.
  const guest = session ? null : await getGuestIdentity();
  const member = session
    ? await getWorkspaceMember(workspace.id, session.user.id)
    : null;

  if (!workspace.changelogPublic && !member) {
    notFound();
  }

  // Linked feedback posts always use the public-visibility filter here,
  // regardless of the viewer's workspace role — hidden/unapproved posts must
  // never surface on the public portal, even to a signed-in admin.
  const entry = await getChangelogEntryById(entryId, workspace.id, {
    publicOnly: true,
    userId: session?.user.id ?? null,
  });
  if (!entry?.isPublished) {
    notFound();
  }

  const isSignedIn = !!session;
  const renderedBody = sanitizeChangelogHtml(entry.body);
  const allBoards = await listBoardsForWorkspace(workspace.id);
  const publicBoards = allBoards.filter((b) => b.isPublic && !b.isArchived);
  const reactions = await getReactionsForEntry(
    entry.id,
    session?.user.id ?? null
  );
  const entryUrl = `${portalBaseUrl()}/${slug}/changelog/${entryId}`;

  return (
    <EmbedPersonalizationProvider
      changelogEntryId={entry.id}
      includeModerator
      isEmbed={isEmbed}
      postIds={entry.linkedPosts.map((p) => p.id)}
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
          <EmbedModalHeader
            backHref={`/${slug}/changelog${embedQuery}`}
            title={entry.title}
          />
        )}
        {isEmbed && !isPanel && (
          <EmbedNav
            active="changelog"
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
            active="changelog"
            boards={publicBoards}
            changelogPublic={workspace.changelogPublic}
            currentPath={`/${slug}/changelog/${entryId}`}
            guestEmail={guest?.email}
            guestName={guest?.name}
            isMember={!!member}
            isSignedIn={isSignedIn}
            logoUrl={workspace.logoUrl}
            roadmapPublic={workspace.roadmapPublic}
            rssHref={`/${slug}/changelog/feed.xml`}
            slug={slug}
            userEmail={session?.user.email}
            userImage={session?.user.image}
            userName={session?.user.name}
            workspaceName={workspace.name}
          />
        )}
        {!isEmbed && <PoweredByBadge />}

        {/* Content */}
        <main
          className={
            isPanel
              ? "min-h-0 flex-1 overflow-y-auto px-4 py-4"
              : "mx-auto max-w-3xl px-4 pt-10 pb-20 sm:px-8"
          }
          id="main-content"
        >
          {/* Back link — the panel-mode header above already has its own
              back arrow, so this would otherwise be a second one. */}
          {!isPanel && (
            <Link
              className="mb-8 inline-flex items-center gap-1.5 rounded-ir-sm text-xs text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
              href={`/${slug}/changelog${embedQuery}`}
            >
              <ArrowLeftIcon className="size-3.5" />
              All updates
            </Link>
          )}

          {/* Entry header */}
          <div className="mb-8">
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <ChangelogLabelBadge label={entry.label} size="md" />
              {entry.publishedAt && (
                <time
                  className="text-sm text-ir-muted"
                  dateTime={entry.publishedAt.toISOString()}
                >
                  {format(entry.publishedAt, "MMMM d, yyyy")}
                </time>
              )}
            </div>
            <h1 className="text-2xl leading-snug font-bold tracking-tight text-ir-heading">
              {entry.title}
            </h1>
          </div>

          {/* Cover image */}
          {entry.coverImageUrl && (
            <ImagePreviewThumbnail
              className="mb-8 max-h-96 w-full rounded-ir-sm border border-ir-border object-cover"
              src={entry.coverImageUrl}
            />
          )}

          {/* Rendered body */}
          <ChangelogRenderedBody
            className="prose prose-sm wrap-break-word max-w-none text-ir-body prose-headings:font-semibold prose-headings:text-ir-heading prose-a:text-ir-primary prose-code:bg-ir-muted-surface prose-code:px-1 prose-code:py-0.5 prose-pre:bg-ir-muted-surface prose-img:cursor-zoom-in prose-img:rounded-ir-md"
            html={renderedBody}
          />

          {/* Reactions + share */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ir-border pt-6">
            <ChangelogReactions
              changelogEntryId={entry.id}
              initialReactions={reactions}
              isSignedIn={isSignedIn}
            />
            <ChangelogShareButton title={entry.title} url={entryUrl} />
          </div>

          {/* Linked posts */}
          {entry.linkedPosts.length > 0 && (
            <div className="mt-12 border-t border-ir-border pt-8">
              <h2 className="mb-4 text-sm font-semibold text-ir-heading">
                Related Feedback
              </h2>
              <div className="space-y-2">
                {entry.linkedPosts.map((post) => {
                  const isMerged = !!post.mergedIntoId;
                  return (
                    // Stretched-link pattern: the row is a plain div (not a real
                    // anchor) so the vote button can be a genuine interactive
                    // element beside it — nesting a <button> inside an <a> is
                    // invalid HTML. The title link's after:absolute overlay
                    // stretches its hit-area to the whole row; the vote button
                    // sits in a relative z-10 sibling so it intercepts clicks
                    // above that overlay.
                    <div
                      className="group relative flex flex-col gap-2 rounded-ir-sm border border-ir-border px-4 py-3 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                      key={post.id}
                    >
                      <div className="relative min-w-0 flex-1">
                        <Link
                          className={`text-sm font-medium transition-colors duration-150 ease-ir-standard after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 ${
                            isMerged
                              ? "text-ir-muted"
                              : "text-ir-heading group-hover:text-ir-primary"
                          }`}
                          href={`/${slug}/b/${post.boardSlug}/p/${post.slug}${embedQuery}`}
                        >
                          {post.title}
                        </Link>
                        {isMerged && (
                          <p className="mt-0.5 text-xs text-ir-muted">
                            Merged into {post.mergedIntoTitle ?? "another post"}
                          </p>
                        )}
                      </div>
                      <div className="relative z-10 flex shrink-0 items-center gap-3">
                        <VoteButton
                          compact
                          initialCount={post.upvotes}
                          initialHasVoted={post.hasVoted}
                          isArchived={post.boardIsArchived}
                          isSignedIn={isSignedIn}
                          postId={post.id}
                        />
                        <span className="rounded-ir-sm bg-ir-muted-surface px-2 py-0.5 text-[11px] font-semibold text-ir-muted">
                          {isMerged ? "Merged" : post.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="mt-12">
            <ChangelogCommentSection
              canModerate={!!member && member.role !== WORKSPACE_MEMBER}
              changelogEntryId={entry.id}
              currentUserId={session?.user.id ?? null}
              isSignedIn={isSignedIn}
            />
          </div>
        </main>
      </div>
    </EmbedPersonalizationProvider>
  );
}
