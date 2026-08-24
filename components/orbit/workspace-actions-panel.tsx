"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteOrbitWorkspaceAction,
  suspendWorkspaceAction,
  unsuspendWorkspaceAction,
} from "@/app/actions/orbit-workspaces";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";

interface Props {
  isSuspended: boolean;
  workspaceId: string;
  workspaceSlug: string;
}

export function WorkspaceActionsPanel({
  workspaceId,
  workspaceSlug,
  isSuspended,
}: Props) {
  const router = useRouter();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [deleteSlugInput, setDeleteSlugInput] = useState("");

  async function handleSuspend() {
    setIsPending(true);
    const result = await suspendWorkspaceAction(workspaceId);
    setIsPending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Workspace suspended");
      setSuspendOpen(false);
      router.refresh();
    }
  }

  async function handleUnsuspend() {
    setIsPending(true);
    const result = await unsuspendWorkspaceAction(workspaceId);
    setIsPending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Workspace unsuspended");
      router.refresh();
    }
  }

  async function handleDelete() {
    if (deleteSlugInput !== workspaceSlug) {
      toast.error("Slug does not match");
      return;
    }
    setIsPending(true);
    const result = await deleteOrbitWorkspaceAction(workspaceId);
    setIsPending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Workspace deleted");
      setDeleteOpen(false);
      router.push("/orbit/workspaces");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isSuspended ? (
        <Button
          disabled={isPending}
          onClick={handleUnsuspend}
          size="sm"
          variant="outline"
        >
          Unsuspend
        </Button>
      ) : (
        <Button
          onClick={() => setSuspendOpen(true)}
          size="sm"
          variant="outline"
        >
          Suspend
        </Button>
      )}

      <Button
        className="border-ir-danger/40 bg-ir-danger/5 text-ir-danger hover:bg-ir-danger/10"
        onClick={() => {
          setDeleteSlugInput("");
          setDeleteOpen(true);
        }}
        size="sm"
        variant="outline"
      >
        Delete
      </Button>

      {/* Suspend dialog */}
      <ConfirmDialog
        confirmLabel="Suspend"
        description="All members including the owner will immediately lose access. You can unsuspend at any time."
        isPending={isPending}
        onConfirm={handleSuspend}
        onOpenChange={setSuspendOpen}
        open={suspendOpen}
        title="Suspend workspace?"
        variant="destructive"
      />

      {/* Delete dialog */}
      <ConfirmDialog
        confirmLabel="Delete permanently"
        description={
          "This will permanently delete all data. Type the workspace slug to confirm."
        }
        isPending={isPending}
        onConfirm={handleDelete}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Delete workspace?"
        variant="destructive"
      >
        <Input
          className="font-mono"
          onChange={(e) => setDeleteSlugInput(e.target.value)}
          placeholder={workspaceSlug}
          type="text"
          value={deleteSlugInput}
        />
      </ConfirmDialog>
    </div>
  );
}
