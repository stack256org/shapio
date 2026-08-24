import { useCallback, useRef, useState } from "react";

export interface DropPosition {
  columnId: string;
  // Insertion index within the target column, derived from live DOM order.
  // Ignored by boards that don't support manual within-column ordering.
  index: number;
}

// Shared pointer-hit-testing for both roadmap board flavors (manual and
// derived/synced) — replaces native HTML5 dragover/drop events with plain
// DOM geometry driven by framer-motion's onDrag pointer coordinates.
//
// Reads insertion order directly from each column's live DOM children
// (elements marked `data-kanban-card`) rather than maintaining a second,
// separately-tracked ordered list — the two can never drift out of sync
// because there's only one source of truth (what's actually rendered).
export function useKanbanDrag() {
  const columnEls = useRef(new Map<string, HTMLElement>());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);

  const registerColumn = useCallback(
    (columnId: string) => (el: HTMLElement | null) => {
      if (el) {
        columnEls.current.set(columnId, el);
      } else {
        columnEls.current.delete(columnId);
      }
    },
    []
  );

  const handleDragStart = useCallback((itemId: string) => {
    setDraggingId(itemId);
  }, []);

  const handleDrag = useCallback(
    (point: { x: number; y: number }) => {
      for (const [columnId, columnEl] of columnEls.current) {
        const rect = columnEl.getBoundingClientRect();
        if (
          point.x < rect.left ||
          point.x > rect.right ||
          point.y < rect.top ||
          point.y > rect.bottom
        ) {
          continue;
        }

        const cardEls = Array.from(
          columnEl.querySelectorAll<HTMLElement>("[data-kanban-card]")
        ).filter((el) => el.dataset.kanbanCard !== draggingId);

        let index = cardEls.length;
        for (let i = 0; i < cardEls.length; i++) {
          const cardRect = cardEls[i]!.getBoundingClientRect();
          const midpointY = cardRect.top + cardRect.height / 2;
          if (point.y < midpointY) {
            index = i;
            break;
          }
        }

        setDropPosition({ columnId, index });
        return;
      }
      setDropPosition(null);
    },
    [draggingId]
  );

  const handleDragEnd = useCallback(
    (onDrop: (pos: DropPosition) => void) => {
      if (dropPosition) {
        onDrop(dropPosition);
      }
      setDraggingId(null);
      setDropPosition(null);
    },
    [dropPosition]
  );

  return {
    draggingId,
    dropPosition,
    handleDrag,
    handleDragEnd,
    handleDragStart,
    registerColumn,
  };
}
