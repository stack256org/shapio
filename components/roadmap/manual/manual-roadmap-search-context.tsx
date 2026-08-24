"use client";

import { PlusIcon, SlidersIcon } from "@phosphor-icons/react";
import { createContext, type ReactNode, useContext, useState } from "react";
import type { BoardItem } from "@/components/roadmap/manual/manual-roadmap-card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";

interface ManualRoadmapControls {
  addOpen: boolean;
  addStatusId: string | undefined;
  editItem: BoardItem | null;
  manageOpen: boolean;
  query: string;
  setAddOpen: (open: boolean) => void;
  setAddStatusId: (id: string | undefined) => void;
  setEditItem: (item: BoardItem | null) => void;
  setManageOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
}

const ManualRoadmapContext = createContext<ManualRoadmapControls | null>(null);

// Holds every piece of UI state the manual roadmap board's controls need to
// share with the page header — search query, and the Manage Columns / Add
// Roadmap Item dialog state. The trigger buttons live in the page header
// (rendered by the server-rendered page.tsx) while the dialogs themselves
// stay inside ManualRoadmapBoard further down the tree, so both sides read
// from this single provider instead of prop-drilling.
export function useManualRoadmapControls() {
  const ctx = useContext(ManualRoadmapContext);
  if (!ctx) {
    throw new Error(
      "useManualRoadmapControls must be used within ManualRoadmapProvider"
    );
  }
  return ctx;
}

export function ManualRoadmapProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addStatusId, setAddStatusId] = useState<string | undefined>();
  const [editItem, setEditItem] = useState<BoardItem | null>(null);

  return (
    <ManualRoadmapContext.Provider
      value={{
        query,
        setQuery,
        manageOpen,
        setManageOpen,
        addOpen,
        setAddOpen,
        addStatusId,
        setAddStatusId,
        editItem,
        setEditItem,
      }}
    >
      {children}
    </ManualRoadmapContext.Provider>
  );
}

export function ManualRoadmapSearchInput() {
  const { setQuery } = useManualRoadmapControls();
  return (
    <SearchInput
      aria-label="Search roadmap items"
      className="h-9 w-48 shrink-0"
      onSearch={setQuery}
      placeholder="Search roadmap items"
    />
  );
}

export function ManualRoadmapManageColumnsButton() {
  const { setManageOpen } = useManualRoadmapControls();
  return (
    <Button onClick={() => setManageOpen(true)} variant="outline">
      <SlidersIcon data-icon="inline-start" />
      Manage columns
    </Button>
  );
}

export function ManualRoadmapAddItemButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { setAddStatusId, setEditItem, setAddOpen } =
    useManualRoadmapControls();
  return (
    <Button
      disabled={disabled}
      onClick={() => {
        setAddStatusId(undefined);
        setEditItem(null);
        setAddOpen(true);
      }}
    >
      <PlusIcon data-icon="inline-start" />
      Add Roadmap Item
    </Button>
  );
}
