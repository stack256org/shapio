"use client";

import { PaperPlaneTiltIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePostCategoryAction } from "@/app/actions/categories";
import {
  deletePostAction,
  publishPostAction,
  updatePostStatusAction,
} from "@/app/actions/posts";
import { useBulkSelection } from "@/components/posts/bulk-selection-context";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  color: string;
  id: string;
  name: string;
}

interface WorkspaceStatus {
  color: string;
  id: string;
  isArchived: boolean;
  name: string;
  slug: string;
}

interface BulkActionBarProps {
  categories: Category[];
  // Only enough per-post data to decide which bulk actions apply — draft
  // status for the Publish button. Structurally compatible with the fuller
  // PostsTableRow the caller already has.
  posts: { id: string; isDraft: boolean }[];
  workspaceId: string;
  workspaceStatuses: WorkspaceStatus[];
}

// Bulk actions reuse the existing single-post server actions, called once per
// selected row — no new API surface, just client-side orchestration over the
// already-supported publish/status/delete flows (same as each row's own menu).
export function BulkActionBar({
  posts,
  categories,
  workspaceId,
  workspaceStatuses,
}: BulkActionBarProps) {
  const bulk = useBulkSelection();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isVisible = !!bulk && bulk.selectedCount > 0;
  const ids = bulk?.selectedIds ?? [];
  const clearSelection = bulk?.clear ?? (() => {});

  // Publish only applies to drafts — hide it entirely when every selected
  // post is already published, and only act on the draft ones so the count
  // reported back reflects what was actually changed.
  const draftIds = ids.filter((id) => posts.find((p) => p.id === id)?.isDraft);

  function handlePublish() {
    if (draftIds.length === 0) {
      return;
    }
    startTransition(async () => {
      const results = await Promise.all(
        draftIds.map((postId) => publishPostAction({ postId, workspaceId }))
      );
      const okCount = results.filter((r) => r.success).length;
      if (okCount > 0) {
        toast.success(`Published ${okCount} of ${draftIds.length}`);
      }
      if (okCount < draftIds.length) {
        toast.error(`${draftIds.length - okCount} could not be published`);
      }
      router.refresh();
    });
  }

  function handleStatusChange(status: string) {
    startTransition(async () => {
      const results = await Promise.all(
        ids.map((postId) =>
          updatePostStatusAction({ postId, workspaceId, status })
        )
      );
      const okCount = results.filter((r) => r.success).length;
      if (okCount > 0) {
        toast.success(`Updated status on ${okCount} of ${ids.length}`);
      }
      if (okCount < ids.length) {
        toast.error(`${ids.length - okCount} could not be updated`);
      }
      router.refresh();
    });
  }

  function handleCategoryChange(categoryId: string) {
    startTransition(async () => {
      const results = await Promise.all(
        ids.map((postId) =>
          updatePostCategoryAction({ postId, workspaceId, categoryId })
        )
      );
      const okCount = results.filter((r) => r.success).length;
      if (okCount > 0) {
        toast.success(`Updated category on ${okCount} of ${ids.length}`);
      }
      if (okCount < ids.length) {
        toast.error(`${ids.length - okCount} could not be updated`);
      }
      router.refresh();
    });
  }

  function handleDeleteConfirm() {
    startTransition(async () => {
      const results = await Promise.all(
        ids.map((postId) => deletePostAction({ postId, workspaceId }))
      );
      const okCount = results.filter((r) => r.success).length;
      toast.success(`Deleted ${okCount} of ${ids.length}`);
      setDeleteOpen(false);
      clearSelection();
      router.refresh();
    });
  }

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 flex-wrap items-center gap-3 rounded-ir-card border border-ir-border bg-ir-surface px-4 py-3 shadow-ir-lg"
            exit={shouldReduceMotion ? undefined : { y: 24, opacity: 0 }}
            initial={shouldReduceMotion ? false : { y: 24, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <span className="text-sm font-medium text-ir-heading">
              {bulk?.selectedCount} selected
            </span>
            <div className="h-4 w-px bg-ir-border" />
            {draftIds.length > 0 && (
              <Button
                disabled={isPending}
                onClick={handlePublish}
                size="sm"
                variant="outline"
              >
                <PaperPlaneTiltIcon data-icon="inline-start" />
                Publish
                {draftIds.length < ids.length ? ` (${draftIds.length})` : ""}
              </Button>
            )}
            <Select
              disabled={isPending}
              onValueChange={handleStatusChange}
              value=""
            >
              <SelectTrigger size="sm">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent>
                {workspaceStatuses
                  .filter((s) => !s.isArchived)
                  .map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {categories.length > 0 && (
              <Select
                disabled={isPending}
                onValueChange={handleCategoryChange}
                value=""
              >
                <SelectTrigger size="sm">
                  <SelectValue placeholder="Set category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              disabled={isPending}
              onClick={() => setDeleteOpen(true)}
              size="sm"
              variant="destructive"
            >
              <TrashIcon data-icon="inline-start" />
              Delete
            </Button>
            <Button
              aria-label="Clear selection"
              className="ml-auto"
              onClick={clearSelection}
              size="icon-xs"
              variant="ghost"
            >
              <XIcon />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        confirmLabel="Delete Feedback"
        description={`Delete ${bulk?.selectedCount ?? 0} selected feedback item${bulk?.selectedCount === 1 ? "" : "s"}? This permanently removes them along with their comments and votes. This action cannot be undone.`}
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Delete Feedback"
      />
    </>
  );
}
