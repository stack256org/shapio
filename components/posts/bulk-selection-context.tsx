"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface BulkSelectionValue {
  allSelected: boolean;
  clear: () => void;
  isSelected: (id: string) => boolean;
  selectAll: () => void;
  selectedCount: number;
  selectedIds: string[];
  toggle: (id: string) => void;
}

const BulkSelectionContext = createContext<BulkSelectionValue | null>(null);

// Returns null when rendered outside a provider — lets PostRow/PostsTable call
// this unconditionally and simply skip bulk-select UI wherever it isn't
// opted into (Dashboard, public profile).
export function useBulkSelection() {
  return useContext(BulkSelectionContext);
}

export function BulkSelectionProvider({
  allIds,
  children,
}: {
  allIds: string[];
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const value = useMemo<BulkSelectionValue>(() => {
    const selectedIds = Array.from(selected);
    return {
      selectedIds,
      selectedCount: selectedIds.length,
      allSelected: allIds.length > 0 && allIds.every((id) => selected.has(id)),
      isSelected: (id: string) => selected.has(id),
      toggle: (id: string) => {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
      },
      selectAll: () => {
        setSelected((prev) =>
          prev.size === allIds.length ? new Set() : new Set(allIds)
        );
      },
      clear: () => setSelected(new Set()),
    };
  }, [selected, allIds]);

  return (
    <BulkSelectionContext.Provider value={value}>
      {children}
    </BulkSelectionContext.Provider>
  );
}

export function SelectAllCheckbox() {
  const bulk = useBulkSelection();
  if (!bulk) {
    return null;
  }
  return (
    <Checkbox
      aria-label="Select all rows"
      checked={bulk.allSelected}
      onCheckedChange={bulk.selectAll}
    />
  );
}

export function RowCheckbox({ id, label }: { id: string; label: string }) {
  const bulk = useBulkSelection();
  if (!bulk) {
    return null;
  }
  return (
    <Checkbox
      aria-label={`Select ${label}`}
      checked={bulk.isSelected(id)}
      onCheckedChange={() => bulk.toggle(id)}
    />
  );
}
