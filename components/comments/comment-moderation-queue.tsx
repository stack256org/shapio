"use client";

import { CheckIcon, TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RelativeTime } from "@/components/ui/relative-time";
import { commentPreviewText } from "@/lib/comments/preview";
import { embedFetch } from "@/lib/embed/fetch";
import type { CommentApi, CommentData, ReplyData } from "./types";

type PendingComment = (CommentData | ReplyData) & { replies?: ReplyData[] };

interface CommentModerationQueueProps {
  api?: CommentApi;
  pending: PendingComment[];
}

function PendingCommentRow({
  comment,
  commentBaseUrl,
  onApprove,
  onDelete,
}: {
  comment: PendingComment;
  commentBaseUrl: string;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  async function handleApprove() {
    setIsApproving(true);
    try {
      const res = await embedFetch(`${commentBaseUrl}/${comment.id}/approve`, {
        method: "PATCH",
      });
      if (res.ok) {
        onApprove(comment.id);
      }
    } catch {
      // silent
    } finally {
      setIsApproving(false);
    }
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    try {
      const res = await embedFetch(`${commentBaseUrl}/${comment.id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        setShowDeleteDialog(false);
        onDelete(comment.id);
        toast.success("Comment deleted successfully");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to delete comment.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="flex gap-3 border-b border-ir-border py-3 last:border-0">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ir-muted-surface text-xs font-semibold text-ir-muted">
          {(comment.authorName ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xs font-medium text-ir-heading">
              {comment.authorName ?? "Anonymous"}
            </span>
            {comment.isGuest && (
              <span className="rounded-ir-full border border-ir-border px-1.5 text-2xs tracking-wide text-ir-muted uppercase">
                Guest
              </span>
            )}
            {comment.parentId && (
              <span className="rounded-ir-full border border-ir-border px-1.5 text-2xs tracking-wide text-ir-muted uppercase">
                Reply
              </span>
            )}
            <span className="text-xs text-ir-muted">
              <RelativeTime
                date={comment.createdAt}
                options={{ addSuffix: true }}
              />
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-ir-body wrap-break-word">
            {commentPreviewText(comment.body, 5000)}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-2 pt-0.5">
          <Button
            aria-label="Approve comment"
            className="text-ir-success"
            disabled={isApproving || isDeleting}
            onClick={handleApprove}
            size="icon-xs"
            title="Approve"
            variant="ghost"
          >
            <CheckIcon />
          </Button>
          <Button
            aria-label="Delete comment"
            className="text-ir-danger"
            disabled={isApproving || isDeleting}
            onClick={() => setShowDeleteDialog(true)}
            size="icon-xs"
            title="Delete"
            variant="ghost"
          >
            <TrashIcon />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
        onOpenChange={setShowDeleteDialog}
        open={showDeleteDialog}
        title="Delete Comment"
      />
    </>
  );
}

export default function CommentModerationQueue({
  api,
  pending: initialPending,
}: CommentModerationQueueProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingComment[]>(initialPending);
  const commentBaseUrl = api?.commentBaseUrl ?? "/api/comments";

  if (pending.length === 0) {
    return null;
  }

  function handleApprove(id: string) {
    setPending((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  function handleDelete(id: string) {
    setPending((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="mt-8 rounded-ir-card border border-ir-warning/30 bg-ir-warning/10 p-4">
      <h3 className="mb-3 text-xs font-semibold tracking-wide text-ir-warning uppercase">
        Pending Approval ({pending.length})
      </h3>
      <div>
        {pending.map((comment) => (
          <PendingCommentRow
            comment={comment}
            commentBaseUrl={commentBaseUrl}
            key={comment.id}
            onApprove={handleApprove}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
