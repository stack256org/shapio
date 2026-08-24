"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteRoadmapItemAction,
  moveRoadmapItemAction,
} from "@/app/actions/roadmap";
import { DraggableCard } from "@/components/roadmap/draggable-card";
import { useManualRoadmapControls } from "@/components/roadmap/manual/manual-roadmap-search-context";
import { RoadmapEmptyState } from "@/components/roadmap/roadmap-empty-state";
import { RoadmapStatusHeader } from "@/components/roadmap/roadmap-status-header";
import { useKanbanDrag } from "@/components/roadmap/use-kanban-drag";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AddRoadmapItemDialog } from "./add-roadmap-item-dialog";
import { ManualItemDetailDialog } from "./manual-item-detail-dialog";
import { type BoardItem, ManualRoadmapCard } from "./manual-roadmap-card";
import {
  type ManagerStatus,
  RoadmapStatusManagerDialog,
} from "./roadmap-status-manager-dialog";

export interface BoardStatus {
  color: string;
  id: string;
  itemCount: number;
  name: string;
}

interface ManualRoadmapBoardProps {
  // Gates the drag gesture on its own, separate from `canManage` (which also
  // gates add/edit/delete/manage-columns) — lets the public roadmap page
  // allow team members to drag-to-retriage without exposing full item
  // management on a public URL. Defaults to `canManage` when omitted.
  canDrag?: boolean;
  canManage: boolean;
  items: BoardItem[];
  statuses: BoardStatus[];
  // Rendered where the search bar used to sit — the search input itself now
  // lives in the page header (see ManualRoadmapSearchProvider/-Input) since
  // this slot is where the Sync-from-Feedback toggle moved to.
  syncToggle?: ReactNode;
  workspaceId: string;
}

type Cols = Record<string, BoardItem[]>;

function buildCols(statuses: BoardStatus[], items: BoardItem[]): Cols {
  const map: Cols = {};
  for (const s of statuses) {
    map[s.id] = [];
  }
  for (const it of items) {
    const arr = map[it.statusId];
    if (arr) {
      arr.push(it);
    } else {
      map[it.statusId] = [it];
    }
  }
  return map;
}

export function ManualRoadmapBoard({
  workspaceId,
  statuses,
  items,
  canManage,
  canDrag,
  syncToggle,
}: ManualRoadmapBoardProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [cols, setCols] = useState<Cols>(() => buildCols(statuses, items));
  const {
    draggingId,
    dropPosition,
    handleDrag,
    handleDragEnd,
    handleDragStart,
    registerColumn,
  } = useKanbanDrag();

  const {
    query,
    manageOpen,
    setManageOpen,
    addOpen,
    setAddOpen,
    addStatusId,
    setAddStatusId,
    editItem,
    setEditItem,
  } = useManualRoadmapControls();
  const [viewItem, setViewItem] = useState<BoardItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BoardItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Client-side filter over the loaded items (title + description). Dragging is
  // disabled while a filter is active so a reorder can never renumber a column
  // using a partial (filtered) view of its cards.
  const q = query.trim().toLowerCase();
  const isFiltering = q.length > 0;
  const dragEnabled = (canDrag ?? canManage) && !isFiltering;
  const matchesQuery = (it: BoardItem) =>
    !q ||
    it.title.toLowerCase().includes(q) ||
    (it.description ?? "").toLowerCase().includes(q);

  // Re-seed local state whenever the server sends fresh data (after a refresh).
  useEffect(() => {
    setCols(buildCols(statuses, items));
  }, [statuses, items]);

  function performMove(item: BoardItem, targetStatusId: string, index: number) {
    const next: Cols = {};
    for (const s of statuses) {
      next[s.id] = cols[s.id] ? [...cols[s.id]!] : [];
    }
    const source = next[item.statusId];
    const posInSource = source?.findIndex((i) => i.id === item.id) ?? -1;
    // No-op when dropped back onto its exact spot.
    if (
      item.statusId === targetStatusId &&
      posInSource !== -1 &&
      (index === posInSource || index === posInSource + 1)
    ) {
      return;
    }
    if (source) {
      next[item.statusId] = source.filter((i) => i.id !== item.id);
    }
    const target = next[targetStatusId] ?? [];
    const clampedIndex = Math.max(0, Math.min(index, target.length));
    target.splice(clampedIndex, 0, { ...item, statusId: targetStatusId });
    next[targetStatusId] = target;
    setCols(next);

    const orderedIds = target.map((i) => i.id);
    (async () => {
      const res = await moveRoadmapItemAction({
        workspaceId,
        itemId: item.id,
        statusId: targetStatusId,
        orderedIds,
      });
      if (!res.success) {
        toast.error(res.error);
        setCols(buildCols(statuses, items));
        return;
      }
      router.refresh();
    })();
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }
    setIsDeleting(true);
    (async () => {
      const res = await deleteRoadmapItemAction({
        workspaceId,
        itemId: deleteTarget.id,
      });
      setIsDeleting(false);
      setDeleteTarget(null);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Item deleted");
      router.refresh();
    })();
  }

  const managerStatuses: ManagerStatus[] = statuses.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    itemCount: (cols[s.id] ?? []).length,
  }));

  const totalItems = Object.values(cols).reduce((n, arr) => n + arr.length, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {(canManage || dragEnabled || syncToggle) && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 pt-2 pb-4">
          <div className="flex justify-start">{syncToggle}</div>
          <div className="flex justify-end">
            {canManage ? (
              <p className="text-xs text-ir-muted">
                Manual roadmap · {totalItems} item
                {totalItems === 1 ? "" : "s"} · drag cards between columns
              </p>
            ) : (
              dragEnabled && (
                <p className="text-xs text-ir-muted">
                  Drag a card into another column to change its status.
                </p>
              )
            )}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-6">
        {statuses.length === 0 ? (
          <div className="rounded-ir-card border border-dashed border-ir-border px-4 py-16 text-center text-sm text-ir-muted">
            No roadmap columns yet.
            {canManage && (
              <button
                className="ml-1 cursor-pointer rounded-ir-xs text-ir-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                onClick={() => setManageOpen(true)}
                type="button"
              >
                Add one
              </button>
            )}
          </div>
        ) : (
          <div className="grid h-full auto-rows-fr grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {statuses.map((s) => {
              // Filter for DISPLAY only. performMove always reads the full,
              // unfiltered `cols`, and dragging is off while filtering, so the
              // filter can never corrupt column ordering.
              const columnItems = (cols[s.id] ?? []).filter(matchesQuery);
              const isDropTarget = dropPosition?.columnId === s.id;
              return (
                <div
                  className="flex min-h-0 w-full min-w-0 flex-col"
                  key={s.id}
                >
                  <RoadmapStatusHeader
                    color={s.color}
                    count={columnItems.length}
                    name={s.name}
                  />

                  {/* Drop zone. flex-1 + overflow-y-auto so it fills the
                      column's full stretched height and scrolls internally
                      while the header above stays put — see
                      roadmap-column.tsx for why flex-1 (not just min-h-*)
                      matters: without it, a short column's actual drop-zone
                      element (what useKanbanDrag hit-tests via
                      getBoundingClientRect) only wraps its own cards, leaving
                      empty space below that looks part of the column but
                      isn't. overflow-y-auto also resets the flex item's
                      automatic min-height to 0, so min-h-24 (not min-h-0)
                      still acts as the real floor. Keyboard users
                      reorder/move via the item Edit dialog's Column selector
                      and the Manage-columns controls; drag is a
                      pointer-only enhancement (see DraggableCard — it can
                      only be started from each card's drag handle). */}
                  <div
                    className={`flex min-h-24 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto rounded-ir-md p-1 transition-colors duration-150 ease-ir-standard ${
                      isDropTarget && dragEnabled
                        ? "bg-ir-primary-light/10 ring-1 ring-inset ring-ir-primary/30"
                        : ""
                    }`}
                    ref={registerColumn(s.id)}
                  >
                    {columnItems.length === 0 ? (
                      <RoadmapEmptyState
                        label={
                          isFiltering
                            ? "No matches"
                            : dragEnabled
                              ? "Drop items here"
                              : "Nothing here yet."
                        }
                      />
                    ) : (
                      <AnimatePresence initial={false}>
                        {columnItems.map((item) => (
                          <motion.div
                            animate={{ opacity: 1, y: 0 }}
                            exit={
                              shouldReduceMotion ? undefined : { opacity: 0 }
                            }
                            initial={
                              shouldReduceMotion ? false : { opacity: 0, y: 4 }
                            }
                            key={item.id}
                            layout={!shouldReduceMotion}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                          >
                            <DraggableCard
                              dragEnabled={dragEnabled}
                              isDragging={draggingId === item.id}
                              itemId={item.id}
                              onDrag={handleDrag}
                              onDragEnd={() =>
                                handleDragEnd((pos) =>
                                  performMove(item, pos.columnId, pos.index)
                                )
                              }
                              onDragStart={() => handleDragStart(item.id)}
                            >
                              {(dragControls, wasDragged) => (
                                <ManualRoadmapCard
                                  canDrag={dragEnabled}
                                  canManage={canManage}
                                  dragControls={dragControls}
                                  dragging={draggingId === item.id}
                                  item={item}
                                  onDelete={setDeleteTarget}
                                  onEdit={(it) => {
                                    setEditItem(it);
                                    setAddOpen(false);
                                  }}
                                  onView={setViewItem}
                                  wasDragged={wasDragged}
                                />
                              )}
                            </DraggableCard>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}

                    {canManage && (
                      <button
                        className="mt-1 flex cursor-pointer items-center justify-center gap-1 rounded-ir-sm border border-dashed border-ir-border py-1.5 text-xs text-ir-muted transition-colors duration-150 ease-ir-standard hover:border-ir-primary/30 hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                        onClick={() => {
                          setEditItem(null);
                          setAddStatusId(s.id);
                          setAddOpen(true);
                        }}
                        type="button"
                      >
                        <PlusIcon className="size-3.5" /> Add item
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ManualItemDetailDialog
        canManage={canManage}
        item={viewItem}
        onDelete={setDeleteTarget}
        onEdit={
          canManage
            ? (it) => {
                setEditItem(it);
                setAddOpen(false);
              }
            : undefined
        }
        onOpenChange={(o) => !o && setViewItem(null)}
      />

      {canManage && (
        <>
          <AddRoadmapItemDialog
            defaultStatusId={addStatusId}
            onOpenChange={setAddOpen}
            onSaved={() => router.refresh()}
            open={addOpen}
            statuses={statuses}
            workspaceId={workspaceId}
          />
          <AddRoadmapItemDialog
            item={editItem}
            onOpenChange={(o) => !o && setEditItem(null)}
            onSaved={() => router.refresh()}
            open={!!editItem}
            statuses={statuses}
            workspaceId={workspaceId}
          />
          <RoadmapStatusManagerDialog
            onOpenChange={setManageOpen}
            onSaved={() => router.refresh()}
            open={manageOpen}
            statuses={managerStatuses}
            workspaceId={workspaceId}
          />
          <ConfirmDialog
            confirmLabel="Delete"
            description={`Delete “${deleteTarget?.title}”? This cannot be undone.`}
            isPending={isDeleting}
            onConfirm={handleDeleteConfirm}
            onOpenChange={(o) => !o && setDeleteTarget(null)}
            open={!!deleteTarget}
            title="Delete roadmap item"
            variant="destructive"
          />
        </>
      )}
    </div>
  );
}
