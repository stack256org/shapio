"use client";

import {
  ArrowsSplitIcon,
  CopyIcon,
  DotsThreeIcon,
  GitMergeIcon,
  PaperPlaneTiltIcon,
  PencilIcon,
  PushPinIcon,
  PushPinSlashIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deletePostAction,
  duplicatePostAction,
  mergePostAction,
  pinPostAction,
  publishPostAction,
  searchMergeTargetsAction,
  unmergePostAction,
} from "@/app/actions/posts";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostActionsMenuProps {
  // Detail-page URL for this post; Edit navigates here (opening inline edit)
  // rather than opening a modal.
  detailHref: string;
  isDraft?: boolean;
  isPinned: boolean;
  mergedIntoId?: string | null;
  postCommentCount?: number;
  postId: string;
  postTitle: string;
  workspaceId: string;
}

interface MergeTarget {
  commentCount: number;
  id: string;
  title: string;
  upvotes: number;
}

// Feedback-level actions (edit / duplicate / pin / merge / delete of the whole
// item), kept in a dedicated menu and clearly labelled "Feedback" so they can't
// be mistaken for the per-comment actions inside the comment thread.
export function PostActionsMenu({
  postId,
  workspaceId,
  detailHref,
  isDraft = false,
  isPinned,
  postTitle,
  postCommentCount = 0,
  mergedIntoId = null,
}: PostActionsMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [unmergeOpen, setUnmergeOpen] = useState(false);

  // Merge dialog state
  const [mergeQuery, setMergeQuery] = useState("");
  const [mergeResults, setMergeResults] = useState<MergeTarget[]>([]);
  const [mergeSelected, setMergeSelected] = useState<MergeTarget | null>(null);
  const [mergeSearching, setMergeSearching] = useState(false);
  const mergeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handlePinToggle() {
    startTransition(async () => {
      const result = await pinPostAction({
        postId,
        workspaceId,
        pin: !isPinned,
      });
      if (result.success) {
        toast.success(isPinned ? "Feedback unpinned" : "Feedback pinned");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to update pin.");
      }
    });
  }

  function handlePublish() {
    startTransition(async () => {
      const result = await publishPostAction({ postId, workspaceId });
      if (result.success) {
        toast.success("Draft published");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to publish draft.");
      }
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicatePostAction({ postId, workspaceId });
      if (result.success) {
        toast.success("Feedback duplicated");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to duplicate feedback.");
      }
    });
  }

  function fetchMergeTargets(q: string) {
    setMergeSearching(true);
    startTransition(async () => {
      const result = await searchMergeTargetsAction({
        workspaceId,
        query: q,
        excludePostId: postId,
      });
      if (result.success) {
        setMergeResults(result.data.posts);
      }
      setMergeSearching(false);
    });
  }

  // Update the input immediately, but debounce the server search so typing
  // doesn't fire an API/DB query on every keystroke.
  function handleMergeSearchChange(value: string) {
    setMergeQuery(value);
    setMergeSelected(null);
    setMergeSearching(true);
    if (mergeDebounceRef.current) {
      clearTimeout(mergeDebounceRef.current);
    }
    mergeDebounceRef.current = setTimeout(() => fetchMergeTargets(value), 300);
  }

  function openMerge() {
    setMergeQuery("");
    setMergeSelected(null);
    setMergeResults([]);
    setMergeOpen(true);
    // One bounded fetch of the top candidates — never the whole workspace.
    fetchMergeTargets("");
  }

  function handleMergeOpenChange(open: boolean) {
    if (!open && mergeDebounceRef.current) {
      clearTimeout(mergeDebounceRef.current);
    }
    setMergeOpen(open);
  }

  function handleMergeConfirm() {
    if (!mergeSelected) {
      return;
    }
    startTransition(async () => {
      const result = await mergePostAction({
        sourceId: postId,
        targetId: mergeSelected.id,
        workspaceId,
      });
      if (result.success) {
        toast.success("Feedback merged");
        setMergeOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to merge feedback.");
      }
    });
  }

  function handleUnmergeConfirm() {
    startTransition(async () => {
      const result = await unmergePostAction({ postId, workspaceId });
      if (result.success) {
        toast.success("Feedback unmerged");
        setUnmergeOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to unmerge feedback.");
      }
    });
  }

  function handleDeleteConfirm() {
    startTransition(async () => {
      const result = await deletePostAction({ postId, workspaceId });
      if (result.success) {
        toast.success("Feedback deleted successfully");
        setDeleteOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to delete feedback.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Feedback actions"
            className="text-ir-muted hover:text-ir-heading"
            size="icon-sm"
            variant="ghost"
          >
            <DotsThreeIcon className="size-5" weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {isDraft && (
            <>
              <DropdownMenuItem onClick={handlePublish}>
                <PaperPlaneTiltIcon />
                Publish
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => router.push(`${detailHref}?edit=1`)}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicate}>
            <CopyIcon />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePinToggle}>
            {isPinned ? <PushPinSlashIcon /> : <PushPinIcon />}
            {isPinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          {mergedIntoId ? (
            <DropdownMenuItem onClick={() => setUnmergeOpen(true)}>
              <ArrowsSplitIcon />
              Unmerge
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={openMerge}>
              <GitMergeIcon />
              Merge
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            variant="destructive"
          >
            <TrashIcon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Merge */}
      <Dialog onOpenChange={handleMergeOpenChange} open={mergeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Merge feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-ir-muted">
              Merge{" "}
              <span className="font-medium text-ir-heading">"{postTitle}"</span>{" "}
              into another post. Votes transfer to the destination
              {postCommentCount > 0 &&
                ` — ${postCommentCount} comment${postCommentCount === 1 ? "" : "s"} stay${postCommentCount === 1 ? "s" : ""} here`}
              , and this post is locked and marked merged.
            </p>
            <input
              className="w-full rounded-ir-input border border-ir-border bg-ir-surface px-3 py-2 text-sm text-ir-body placeholder:text-ir-muted focus:outline-none focus:ring-2 focus:ring-ir-primary/40"
              onChange={(e) => handleMergeSearchChange(e.target.value)}
              placeholder="Search posts to merge into…"
              type="text"
              value={mergeQuery}
            />
            <div className="max-h-60 divide-y divide-ir-border overflow-y-auto rounded-ir-md border border-ir-border">
              {mergeResults.length > 0 ? (
                mergeResults.map((r) => (
                  <button
                    className={`block w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors duration-150 ease-ir-standard focus-visible:outline-none ${
                      mergeSelected?.id === r.id
                        ? "bg-ir-primary-light/20 text-ir-primary"
                        : "text-ir-body hover:bg-ir-muted-surface"
                    }`}
                    key={r.id}
                    onClick={() => setMergeSelected(r)}
                    type="button"
                  >
                    <span className="line-clamp-1">{r.title}</span>
                    <span className="mt-0.5 flex items-center gap-2.5 text-2xs text-ir-muted">
                      <span>↑ {r.upvotes}</span>
                      {r.commentCount > 0 && (
                        <span>
                          {r.commentCount} comment
                          {r.commentCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-3 text-xs text-ir-muted">
                  {mergeSearching ? "Searching…" : "No matching posts."}
                </p>
              )}
            </div>

            {/* Visual before/after — clearer hierarchy than a single sentence
              once a target is actually chosen. */}
            {mergeSelected && (
              <div className="rounded-ir-md border border-ir-primary/25 bg-ir-primary-light/10 p-3 text-xs">
                <div className="flex items-center gap-2 text-ir-heading">
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {postTitle}
                  </span>
                  <span className="shrink-0 text-ir-primary">→</span>
                  <span className="min-w-0 flex-1 truncate text-right font-medium">
                    {mergeSelected.title}
                  </span>
                </div>
                <p className="mt-1.5 text-ir-muted">
                  This post will be locked and shown as merged everywhere it
                  appears.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={() => setMergeOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isPending || !mergeSelected}
              onClick={handleMergeConfirm}
            >
              {isPending ? "Merging…" : "Merge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unmerge */}
      <ConfirmDialog
        confirmLabel="Unmerge"
        description={`Unmerge "${postTitle}"? It becomes an independent, active item again — its pre-merge votes are restored, and any votes cast since the merge stay as they are.`}
        isPending={isPending}
        onConfirm={handleUnmergeConfirm}
        onOpenChange={setUnmergeOpen}
        open={unmergeOpen}
        title="Unmerge feedback"
        variant="default"
      />

      {/* Delete */}
      <ConfirmDialog
        confirmLabel="Delete Feedback"
        description={`Delete "${postTitle}"? This permanently removes the feedback item along with all of its comments and votes. This action cannot be undone.`}
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Delete Feedback"
      />
    </>
  );
}
