"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deletePostAction } from "@/app/actions/posts";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface DeletePostButtonProps {
  boardHref: string;
  postId: string;
  workspaceId: string;
}

export default function DeletePostButton({
  postId,
  workspaceId,
  boardHref,
}: DeletePostButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDialog, setShowDialog] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      const result = await deletePostAction({ postId, workspaceId });
      if (result.success) {
        toast.success("Feedback deleted successfully");
        router.push(boardHref);
      } else {
        toast.error(result.error ?? "Failed to delete feedback.");
        setShowDialog(false);
      }
    });
  }

  return (
    <>
      <button
        className="flex items-center gap-1.5 text-xs text-ir-danger transition-opacity duration-150 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:opacity-50"
        disabled={isPending}
        onClick={() => setShowDialog(true)}
        type="button"
      >
        <TrashIcon className="size-3.5" />
        {isPending ? "Deleting…" : "Delete Feedback"}
      </button>

      <ConfirmDialog
        confirmLabel="Delete Feedback"
        description="Delete this entire feedback item? This permanently removes it along with all of its comments and votes — this is not the same as deleting a single comment. This action cannot be undone."
        isPending={isPending}
        onConfirm={handleConfirm}
        onOpenChange={setShowDialog}
        open={showDialog}
        title="Delete Feedback"
      />
    </>
  );
}
