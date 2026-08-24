"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { updatePostStatusAction } from "@/app/actions/posts";
import type { RoadmapPost, RoadmapStatusColumn } from "@/lib/roadmap/queries";
import { RoadmapColumn } from "./roadmap-column";
import { useKanbanDrag } from "./use-kanban-drag";

interface RoadmapBoardProps {
  // Dragging a card to another column changes the post's status (triage,
  // permitted for any workspace member per PLATFORM.md §4). Passed as `true`
  // by the admin-shelled /settings/roadmap page for any member, and as
  // `isMember` by the public /roadmap page — a signed-in team member gets
  // the same drag capability there; anonymous visitors and non-members never
  // get it.
  canManage?: boolean;
  columns: RoadmapStatusColumn[];
  // Threaded through to each card's post-detail link so opening an item from
  // the embedded roadmap stays inside the widget instead of dropping back to
  // full Public Portal chrome. Empty/undefined outside the embed.
  embedQuery?: string;
  // Whether a category/search filter is currently narrowing `columns` — an
  // empty column reads differently ("No matches") than a genuinely empty
  // roadmap ("Nothing in {name} yet.").
  isFiltering?: boolean;
  isSignedIn: boolean;
  // Fixed per-route, never per-viewer: true only on the admin-shelled
  // /settings/roadmap page. The public /roadmap page never sets this, even
  // for signed-in members — the public portal must never redirect into the
  // workspace app on its own.
  useWorkspaceLinks?: boolean;
  workspaceId?: string;
  workspaceSlug: string;
}

type Cols = Record<string, RoadmapPost[]>;

function buildCols(columns: RoadmapStatusColumn[]): Cols {
  const map: Cols = {};
  for (const c of columns) {
    map[c.id] = c.posts;
  }
  return map;
}

export function RoadmapBoard({
  columns,
  workspaceSlug,
  workspaceId,
  isSignedIn,
  isFiltering = false,
  useWorkspaceLinks,
  canManage,
  embedQuery,
}: RoadmapBoardProps) {
  const router = useRouter();
  const [cols, setCols] = useState<Cols>(() => buildCols(columns));
  const {
    draggingId,
    dropPosition,
    handleDrag,
    handleDragEnd,
    handleDragStart,
    registerColumn,
  } = useKanbanDrag();

  // Re-seed local state whenever the server sends fresh data (after a refresh
  // or a search/filter change).
  useEffect(() => {
    setCols(buildCols(columns));
  }, [columns]);

  function performMove(sourceColId: string, targetCol: RoadmapStatusColumn) {
    const post = cols[sourceColId]?.find((p) => p.id === draggingId);
    if (!post || !workspaceId || sourceColId === targetCol.id) {
      return;
    }

    const previous = cols;
    setCols((prev) => {
      const next: Cols = { ...prev };
      next[sourceColId] = (prev[sourceColId] ?? []).filter(
        (p) => p.id !== post.id
      );
      next[targetCol.id] = [
        { ...post, status: targetCol.slug },
        ...(prev[targetCol.id] ?? []),
      ];
      return next;
    });

    (async () => {
      const res = await updatePostStatusAction({
        postId: post.id,
        workspaceId,
        status: targetCol.slug,
      });
      if (!res.success) {
        toast.error(res.error);
        setCols(previous);
        return;
      }
      toast.success(`Moved to ${targetCol.name}`);
      router.refresh();
    })();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {canManage && columns.length > 0 && (
        <p className="shrink-0 px-6 pt-4 pb-2 text-xs text-ir-muted">
          Drag a card into another column to change its status.
        </p>
      )}

      {/* min-h-0 + overflow-y-auto so this area scrolls independently of the
          page — each column's own header stays put above its own scrolling
          card list (see RoadmapColumn) instead of the whole board scrolling
          as one long page. h-full + auto-rows-fr on the grid below give every
          column the same bounded height to scroll within (CSS grid's stretch
          alignment makes that height genuinely definite, not just visual). */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-6">
        {columns.length === 0 ? (
          <div className="rounded-ir-card border border-dashed border-ir-border px-4 py-16 text-center text-sm text-ir-muted">
            No roadmap columns yet. Add feedback statuses to populate the
            roadmap.
          </div>
        ) : (
          // Responsive grid: 1 column on mobile, 2 on tablet, 3 on desktop —
          // a 4th+ column wraps to a new row instead of squeezing into one.
          <div className="grid h-full auto-rows-fr grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {columns.map((col) => (
              <RoadmapColumn
                canManage={canManage}
                color={col.color}
                columnRef={registerColumn(col.id)}
                draggingId={draggingId}
                embedQuery={embedQuery}
                isDropTarget={dropPosition?.columnId === col.id}
                isFiltering={isFiltering}
                isSignedIn={isSignedIn}
                key={col.id}
                name={col.name}
                onDrag={handleDrag}
                onDragEndPost={() =>
                  handleDragEnd((pos) => {
                    const targetCol = columns.find(
                      (c) => c.id === pos.columnId
                    );
                    if (targetCol) {
                      performMove(col.id, targetCol);
                    }
                  })
                }
                onDragStartPost={(post) => handleDragStart(post.id)}
                posts={cols[col.id] ?? []}
                useWorkspaceLinks={useWorkspaceLinks}
                workspaceSlug={workspaceSlug}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
