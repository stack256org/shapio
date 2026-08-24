"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { approvePostAction, deletePostAction } from "@/app/actions/posts";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { truncateHtmlToText } from "@/lib/changelog/html";

interface PendingPost {
  authorEmail: string;
  authorId: string | null;
  authorName: string | null;
  boardId: string;
  body: string | null;
  createdAt: Date;
  id: string;
  slug: string;
  title: string;
  workspaceId: string;
}

interface Props {
  posts: PendingPost[];
  workspaceId: string;
}

export function PendingPostsSection({ workspaceId, posts }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<PendingPost | null>(null);

  function handleApprove(post: PendingPost) {
    startTransition(async () => {
      const result = await approvePostAction({
        postId: post.id,
        workspaceId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Post approved: ${post.title}`);
      router.refresh();
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }
    startTransition(async () => {
      const result = await deletePostAction({
        postId: deleteTarget.id,
        workspaceId,
      });
      setDeleteTarget(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Post deleted");
      router.refresh();
    });
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-ir-heading">Pending posts</h2>
        <p className="mt-0.5 text-xs text-ir-muted">
          Posts awaiting approval before they appear publicly.{" "}
          {posts.length > 0 && (
            <span className="font-medium text-ir-heading">
              {posts.length} pending
            </span>
          )}
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-ir-card border border-dashed border-ir-border p-8 text-center">
          <p className="text-sm text-ir-muted">No posts pending approval.</p>
        </div>
      ) : (
        <div className="divide-y divide-ir-border overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
          {posts.map((post) => (
            <div
              className="flex flex-col gap-2 p-4 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface sm:flex-row sm:items-center sm:gap-4"
              key={post.id}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ir-heading">
                  {post.title}
                </p>
                {post.body && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-ir-muted">
                    {truncateHtmlToText(post.body, 200)}
                  </p>
                )}
                <p className="mt-1 text-xs text-ir-muted">
                  by {post.authorName || post.authorEmail} ·{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(post.createdAt))}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  disabled={isPending}
                  onClick={() => handleApprove(post)}
                  size="xs"
                  type="button"
                >
                  Approve
                </Button>
                <Button
                  disabled={isPending}
                  onClick={() => setDeleteTarget(post)}
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
        confirmLabel="Delete post"
        description={`Delete "${deleteTarget?.title ?? ""}"? This cannot be undone.`}
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={!!deleteTarget}
        title="Delete post"
        variant="destructive"
      />
    </section>
  );
}
