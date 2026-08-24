"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RelativeTime } from "@/components/ui/relative-time";
import { commentPreviewText } from "@/lib/comments/preview";

interface PendingComment {
  authorEmail: string | null;
  authorName: string | null;
  body: string;
  createdAt: Date;
  id: string;
  parentId: string | null;
  postId: string;
  postSlug: string;
  postTitle: string;
}

interface Props {
  comments: PendingComment[];
  workspaceSlug: string;
}

export function PendingCommentsSection({ comments, workspaceSlug }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<PendingComment | null>(null);

  function handleApprove(comment: PendingComment) {
    startTransition(async () => {
      const res = await fetch(`/api/comments/${comment.id}/approve`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to approve comment.");
        return;
      }
      toast.success("Comment approved");
      router.refresh();
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/comments/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to delete comment.");
        return;
      }
      toast.success("Comment deleted");
      router.refresh();
    });
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-ir-heading">
          Pending comments
        </h2>
        <p className="mt-0.5 text-xs text-ir-muted">
          Comments awaiting approval before they appear publicly.{" "}
          {comments.length > 0 && (
            <span className="font-medium text-ir-heading">
              {comments.length} pending
            </span>
          )}
        </p>
      </div>

      {comments.length === 0 ? (
        <div className="rounded-ir-card border border-dashed border-ir-border p-8 text-center">
          <p className="text-sm text-ir-muted">No comments pending approval.</p>
        </div>
      ) : (
        <div className="divide-y divide-ir-border overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
          {comments.map((comment) => (
            <div
              className="flex flex-col gap-2 p-4 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface sm:flex-row sm:items-center sm:gap-4"
              key={comment.id}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-ir-muted">
                  on{" "}
                  <Link
                    className="font-medium text-ir-heading hover:underline"
                    href={`/${workspaceSlug}/feedback/${comment.postId}`}
                  >
                    {comment.postTitle}
                  </Link>
                  {comment.parentId && " · Reply"}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-ir-body">
                  {commentPreviewText(comment.body, 200)}
                </p>
                <p className="mt-1 text-xs text-ir-muted">
                  by {comment.authorName || comment.authorEmail || "Anonymous"}{" "}
                  ·{" "}
                  <RelativeTime
                    date={comment.createdAt}
                    options={{ addSuffix: true }}
                  />
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  disabled={isPending}
                  onClick={() => handleApprove(comment)}
                  size="xs"
                  type="button"
                >
                  Approve
                </Button>
                <Button
                  disabled={isPending}
                  onClick={() => setDeleteTarget(comment)}
                  size="xs"
                  type="button"
                  variant="destructive"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        confirmLabel="Delete comment"
        description="Delete this comment? This cannot be undone."
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={!!deleteTarget}
        title="Delete comment"
        variant="destructive"
      />
    </section>
  );
}
