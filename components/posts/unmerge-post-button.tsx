"use client";

import { ArrowsSplitIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { unmergePostAction } from "@/app/actions/posts";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface UnmergePostButtonProps {
  postId: string;
  postTitle: string;
  workspaceId: string;
}

export default function UnmergePostButton({
  postId,
  postTitle,
  workspaceId,
}: UnmergePostButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await unmergePostAction({ postId, workspaceId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Feedback unmerged");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        className="flex items-center gap-1.5 text-xs text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:opacity-50"
        disabled={isPending}
        onClick={() => setOpen(true)}
        type="button"
      >
        <ArrowsSplitIcon className="size-3.5" />
        Unmerge
      </button>
      <ConfirmDialog
        confirmLabel="Unmerge"
        description={`Unmerge "${postTitle}"? It becomes an independent, active item again — its pre-merge votes are restored, and any votes cast since the merge stay as they are.`}
        isPending={isPending}
        onConfirm={handleConfirm}
        onOpenChange={setOpen}
        open={open}
        title="Unmerge feedback"
        variant="default"
      />
    </>
  );
}
