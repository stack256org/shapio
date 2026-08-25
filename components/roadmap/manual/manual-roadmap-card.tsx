"use client";

import {
  CalendarBlankIcon,
  ChatCircleIcon,
  PencilIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import type { DragControls } from "framer-motion";

export interface BoardItem {
  commentCount: number;
  coverImage: string | null;
  description: string | null;
  feedbackId: string | null;
  id: string;
  launchDate: string | null;
  statusId: string;
  title: string;
  voteCount: number;
}

interface ManualRoadmapCardProps {
  // Gates the drag gesture specifically — separate from `canManage` (which
  // also gates edit/delete) so a viewer can be allowed to drag without
  // getting the rest of the management surface. Defaults to `canManage` when
  // omitted, so the internal settings-page caller (full manage) doesn't need
  // to pass it explicitly.
  canDrag?: boolean;
  canManage: boolean;
  dragControls?: DragControls;
  dragging?: boolean;
  item: BoardItem;
  onDelete?: (item: BoardItem) => void;
  onEdit?: (item: BoardItem) => void;
  onView?: (item: BoardItem) => void;
  // Tells a real drag apart from a plain click — see DraggableCard.
  wasDragged?: () => boolean;
}

function formatLaunch(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : format(d, "MMM d, yyyy");
}

// Descriptions are stored as rich-text HTML (Quill). The compact card shows a
// plain-text preview, so strip tags and collapse whitespace — old plain-text
// descriptions pass through unchanged.
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function ManualRoadmapCard({
  item,
  canManage,
  canDrag,
  onEdit,
  onDelete,
  onView,
  dragging,
  dragControls,
  wasDragged,
}: ManualRoadmapCardProps) {
  const launch = formatLaunch(item.launchDate);
  const descPreview = item.description ? htmlToText(item.description) : "";
  const dragAllowed = canDrag ?? canManage;

  return (
    <div
      className={`group relative rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs transition-all duration-150 ease-ir-standard hover:border-ir-primary/30 hover:shadow-ir-sm ${
        dragAllowed ? "cursor-grab active:cursor-grabbing" : ""
      } ${dragging ? "opacity-95 shadow-ir-lg" : ""}`}
      // Starts the drag from anywhere on the card, not just the handle icon
      // below — a plain press+release never crosses framer's movement
      // threshold, so it never fires onDragStart and falls through to the
      // title button's normal click. Only a real drag needs guarding (see
      // wasDragged below), so this can't reintroduce click-vs-drag ambiguity.
      onPointerDown={dragAllowed ? (e) => dragControls?.start(e) : undefined}
    >
      {item.coverImage && (
        // Cover image is an arbitrary user-supplied external URL (like the
        // workspace logo field) — next/image can't optimize unknown hosts.
        // biome-ignore lint/performance/noImgElement: external user-supplied URL
        <img
          alt=""
          className="h-28 w-full rounded-t-ir-card border-b border-ir-border object-cover"
          src={item.coverImage}
        />
      )}

      <div className="p-3.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {/* The whole card opens the read-only detail view — same pattern
                as the derived-mode card's stretched title link, just backed
                by a dialog instead of navigation (manual items have no
                detail route). */}
            <button
              className="block w-full cursor-pointer text-left text-sm leading-snug font-medium break-words text-ir-heading after:absolute after:inset-0 after:content-[''] hover:text-ir-primary hover:underline focus-visible:underline focus-visible:outline-none"
              onClick={() => {
                if (wasDragged?.()) {
                  return;
                }
                onView?.(item);
              }}
              type="button"
            >
              {item.title}
            </button>
            {descPreview && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed break-words text-ir-muted">
                {descPreview}
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
              {launch && (
                <span className="inline-flex items-center gap-1 rounded-ir-full bg-ir-primary-light/15 px-1.5 py-0.5 text-[11px] font-medium text-ir-primary">
                  <CalendarBlankIcon className="size-3" />
                  {launch}
                </span>
              )}
              {item.voteCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-ir-muted">
                  <span aria-hidden>▲</span>
                  {item.voteCount}
                </span>
              )}
              {item.commentCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-ir-muted">
                  <ChatCircleIcon className="size-3" />
                  {item.commentCount}
                </span>
              )}
            </div>
          </div>

          {canManage && (onEdit || onDelete) && (
            <div className="relative z-10 flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
              {onEdit && (
                <button
                  aria-label="Edit item"
                  className="cursor-pointer rounded-ir-sm p-1.5 text-ir-muted transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                  onClick={() => onEdit(item)}
                  type="button"
                >
                  <PencilIcon className="size-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  aria-label="Delete item"
                  className="cursor-pointer rounded-ir-sm p-1.5 text-ir-danger transition-colors duration-150 ease-ir-standard hover:bg-ir-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                  onClick={() => onDelete(item)}
                  type="button"
                >
                  <TrashIcon className="size-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
