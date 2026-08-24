"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createRoadmapStatusAction,
  deleteRoadmapStatusAction,
  reorderRoadmapStatusesAction,
  updateRoadmapStatusAction,
} from "@/app/actions/roadmap";
import { Button } from "@/components/ui/button";
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ManagerStatus {
  color: string;
  id: string;
  itemCount: number;
  name: string;
}

interface RoadmapStatusManagerDialogProps {
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  open: boolean;
  statuses: ManagerStatus[];
  workspaceId: string;
}

export function RoadmapStatusManagerDialog({
  open,
  onOpenChange,
  workspaceId,
  statuses,
  onSaved,
}: RoadmapStatusManagerDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6b7280");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");

  function startEdit(s: ManagerStatus) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditColor(s.color);
  }

  function saveEdit() {
    if (!editingId || !editName.trim()) {
      return;
    }
    startTransition(async () => {
      const res = await updateRoadmapStatusAction({
        workspaceId,
        statusId: editingId,
        name: editName.trim(),
        color: editColor,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setEditingId(null);
      onSaved();
    });
  }

  function handleCreate() {
    if (!newName.trim()) {
      return;
    }
    startTransition(async () => {
      const res = await createRoadmapStatusAction({
        workspaceId,
        name: newName.trim(),
        color: newColor,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setNewName("");
      onSaved();
    });
  }

  function handleDelete(s: ManagerStatus) {
    if (s.itemCount > 0) {
      toast.error(
        `Move or delete the ${s.itemCount} item${s.itemCount === 1 ? "" : "s"} in “${s.name}” first.`
      );
      return;
    }
    startTransition(async () => {
      const res = await deleteRoadmapStatusAction({
        workspaceId,
        statusId: s.id,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      onSaved();
    });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= statuses.length) {
      return;
    }
    const ids = statuses.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    startTransition(async () => {
      const res = await reorderRoadmapStatusesAction({
        workspaceId,
        orderedIds: ids,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage columns</DialogTitle>
          <DialogDescription>
            Rename, recolor, reorder, or remove roadmap columns. A column must
            be empty before it can be deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-ir-border rounded-ir-md border border-ir-border">
          {statuses.map((s, i) => (
            <div className="p-3" key={s.id}>
              {editingId === s.id ? (
                <div className="space-y-2">
                  <input
                    className="w-full rounded-ir-input border border-ir-border bg-ir-surface px-2.5 py-1.5 text-sm text-ir-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                    maxLength={48}
                    onChange={(e) => setEditName(e.target.value)}
                    value={editName}
                  />
                  <ColorSwatchPicker
                    onChange={setEditColor}
                    value={editColor}
                  />
                  <div className="flex items-center gap-1.5">
                    <Button
                      disabled={isPending || !editName.trim()}
                      onClick={saveEdit}
                      size="xs"
                    >
                      <CheckIcon data-icon="inline-start" /> Save
                    </Button>
                    <Button
                      onClick={() => setEditingId(null)}
                      size="xs"
                      variant="outline"
                    >
                      <XIcon data-icon="inline-start" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <button
                    className="min-w-0 flex-1 cursor-pointer truncate rounded-ir-xs text-left text-sm font-medium text-ir-heading hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                    onClick={() => startEdit(s)}
                    type="button"
                  >
                    {s.name}
                  </button>
                  <span className="text-xs text-ir-muted">{s.itemCount}</span>
                  <div className="flex items-center gap-0.5">
                    <Button
                      aria-label="Move up"
                      disabled={isPending || i === 0}
                      onClick={() => move(i, -1)}
                      size="icon-xs"
                      variant="ghost"
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      aria-label="Move down"
                      disabled={isPending || i === statuses.length - 1}
                      onClick={() => move(i, 1)}
                      size="icon-xs"
                      variant="ghost"
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      aria-label="Delete column"
                      className="text-ir-danger hover:bg-ir-danger/10"
                      disabled={isPending || s.itemCount > 0}
                      onClick={() => handleDelete(s)}
                      size="icon-xs"
                      title={
                        s.itemCount > 0
                          ? "Empty this column first"
                          : "Delete column"
                      }
                      variant="ghost"
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add column */}
        <div className="space-y-2 rounded-ir-md border border-dashed border-ir-border p-3">
          <p className="text-xs font-semibold text-ir-heading">Add column</p>
          <div className="flex items-center gap-2">
            <input
              className="min-w-0 flex-1 rounded-ir-input border border-ir-border bg-ir-surface px-2.5 py-1.5 text-sm text-ir-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
              maxLength={48}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              placeholder="Column name"
              value={newName}
            />
            <Button
              disabled={isPending || !newName.trim()}
              onClick={handleCreate}
              size="sm"
            >
              <PlusIcon data-icon="inline-start" /> Add
            </Button>
          </div>
          <ColorSwatchPicker onChange={setNewColor} value={newColor} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
