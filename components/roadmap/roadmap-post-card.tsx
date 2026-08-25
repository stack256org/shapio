import { ChatCircleIcon, PushPinIcon } from "@phosphor-icons/react/dist/ssr";
import type { DragControls } from "framer-motion";
import Link from "next/link";
import { CategoryChip } from "@/components/categories/category-chip";
import VoteButton from "@/components/voting/vote-button";
import type { RoadmapPost } from "@/lib/roadmap/queries";

interface RoadmapPostCardProps {
  // Shows the drag handle when true — see RoadmapBoard for who gets it
  // (workspace members only), matching the manual roadmap card's same prop.
  canManage?: boolean;
  dragControls?: DragControls;
  // Carries embed=1/theme/accentColor into the post-detail navigation so
  // opening an item from the embedded roadmap doesn't fall back to the full
  // Public Portal chrome — see RoadmapPage. Empty outside the embed.
  embedQuery?: string;
  isDragging?: boolean;
  isSignedIn: boolean;
  post: RoadmapPost;
  useWorkspaceLinks?: boolean;
  // Tells a real drag apart from a plain click — see DraggableCard.
  wasDragged?: () => boolean;
  workspaceSlug: string;
}

export function RoadmapPostCard({
  post,
  workspaceSlug,
  isSignedIn,
  useWorkspaceLinks,
  canManage,
  dragControls,
  isDragging,
  embedQuery = "",
  wasDragged,
}: RoadmapPostCardProps) {
  // Carry the roadmap as the navigation origin so the detail page's Back button
  // returns here instead of the board / All Feedback. Read by both post-detail
  // pages via resolveBackTarget(); falls back gracefully when absent. The
  // `from` value itself must carry embedQuery too — it's used verbatim as the
  // Back link's href, not re-derived on the target page.
  const roadmapHref = useWorkspaceLinks
    ? `/${workspaceSlug}/settings/roadmap`
    : `/${workspaceSlug}/roadmap${embedQuery}`;
  const backSeparator = embedQuery ? "&" : "?";
  const backParams = `${backSeparator}from=${encodeURIComponent(roadmapHref)}&fromLabel=Roadmap`;

  // Fixed by which route rendered this card, never by who's viewing — the
  // public roadmap never redirects into the workspace app on its own.
  const postHref =
    (useWorkspaceLinks
      ? `/${workspaceSlug}/feedback/${post.id}`
      : `/${workspaceSlug}/b/${post.boardSlug}/p/${post.slug}${embedQuery}`) +
    backParams;

  return (
    // `relative` anchors the title's stretched-link overlay to the whole card.
    <div
      className={`group relative rounded-ir-card border border-ir-border bg-ir-surface p-4 shadow-ir-xs transition-all duration-150 ease-ir-standard hover:border-ir-primary/30 hover:shadow-ir-sm ${
        canManage ? "cursor-grab active:cursor-grabbing" : ""
      } ${isDragging ? "opacity-95 shadow-ir-lg" : ""}`}
      // Starts the drag from anywhere on the card, not just the handle icon
      // below — a plain press+release never crosses framer's movement
      // threshold, so it never fires onDragStart and falls through to the
      // title link's normal click. Only a real drag needs guarding (see
      // wasDragged below), so this can't reintroduce click-vs-drag ambiguity.
      onPointerDown={canManage ? (e) => dragControls?.start(e) : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Vote button — kept above the card-wide link overlay (z-10) so voting
            never triggers navigation. */}
        <div className="relative z-10 shrink-0">
          <VoteButton
            initialCount={post.upvotes}
            initialHasVoted={post.hasVoted}
            isArchived={false}
            isSignedIn={isSignedIn}
            postId={post.id}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-start gap-1.5">
            {post.isPinned && (
              <PushPinIcon
                className="mt-0.5 size-3 shrink-0 text-ir-primary"
                weight="fill"
              />
            )}
            {/* The title is the single navigation target. Its `after:inset-0`
                overlay stretches over the whole card, making the entire card
                clickable with one real <Link> — keyboard nav, focus, middle-
                click and "open in new tab" all keep working, and there is no
                second/duplicate click handler. draggable={false}: anchors are
                natively draggable, and this overlay covers most of the card,
                so without it the browser's own link-drag (not our
                framer-motion one) hijacks the gesture the instant a
                whole-card drag starts over it. */}
            <Link
              className="min-w-0 flex-1 break-words text-sm leading-snug font-medium text-ir-heading underline-offset-2 transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-ir-primary group-hover:underline focus-visible:outline-none focus-visible:underline"
              draggable={false}
              href={postHref}
              onClick={(e) => {
                if (wasDragged?.()) {
                  e.preventDefault();
                }
              }}
            >
              {post.title}
            </Link>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {post.categoryName && post.categoryColor && (
              <CategoryChip
                color={post.categoryColor}
                name={post.categoryName}
                size="xs"
              />
            )}
            {post.commentCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-ir-muted">
                <ChatCircleIcon className="size-3" />
                {post.commentCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
