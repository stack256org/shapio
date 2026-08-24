"use client";

import {
  BellIcon,
  GlobeIcon,
  LockIcon,
  PencilIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteChangelogEntryAction,
  publishChangelogEntryAction,
  unpublishChangelogEntryAction,
} from "@/app/actions/changelog";
import { ChangelogLabelBadge } from "@/components/changelog/changelog-label-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { truncateHtmlToText } from "@/lib/changelog/html";

interface ChangelogAdminCardProps {
  entry: {
    id: string;
    title: string;
    label: string;
    body: string;
    coverImageUrl: string | null;
    isPublished: boolean;
    publishedAt: Date | null;
    notifiedAt: Date | null;
    linkedPostCount: number;
  };
  workspaceId: string;
  workspaceSlug: string;
}

export function ChangelogAdminCard({
  entry,
  workspaceId,
  workspaceSlug,
}: ChangelogAdminCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const excerpt = truncateHtmlToText(entry.body, 180);
  const editHref = `/${workspaceSlug}/settings/changelog/${entry.id}/edit`;

  function handlePublish() {
    startTransition(async () => {
      const result = await publishChangelogEntryAction({
        entryId: entry.id,
        workspaceId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Entry published");
      router.refresh();
    });
  }

  function handleUnpublish() {
    startTransition(async () => {
      const result = await unpublishChangelogEntryAction({
        entryId: entry.id,
        workspaceId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Entry moved to draft");
      router.refresh();
    });
  }

  function handleDeleteConfirm() {
    startTransition(async () => {
      const result = await deleteChangelogEntryAction({
        entryId: entry.id,
        workspaceId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Entry deleted");
      setDeleteDialogOpen(false);
      router.refresh();
    });
  }

  return (
    // The whole card navigates to Edit on click, matching the feedback list's
    // rows — only the action buttons below (Edit/Publish/Delete) opt out via
    // stopPropagation, so using them doesn't also trigger navigation. The
    // Edit link itself still provides real keyboard/screen-reader access to
    // the same destination.
    // biome-ignore lint/a11y/noStaticElementInteractions: click-to-navigate on the whole card; Edit link covers keyboard access
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: same — a real, focusable Edit link elsewhere provides the keyboard path
    // biome-ignore lint/a11y/useKeyWithClickEvents: same — no new behavior to make keyboard-reachable, only a click convenience
    <div
      className={`cursor-pointer rounded-ir-card border border-ir-border bg-ir-surface p-5 shadow-ir-xs transition-shadow duration-150 ease-ir-standard hover:shadow-ir-sm ${entry.isPublished ? "" : "opacity-80"}`}
      onClick={() => router.push(editHref)}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <ChangelogLabelBadge label={entry.label} />
          {entry.isPublished ? (
            <span className="inline-flex items-center gap-1 rounded-ir-sm bg-ir-success/10 px-2 py-0.5 text-[11px] font-semibold text-ir-success">
              <GlobeIcon className="size-2.5" />
              Published
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-ir-sm bg-ir-muted-surface px-2 py-0.5 text-[11px] font-semibold text-ir-muted">
              <LockIcon className="size-2.5" />
              Draft
            </span>
          )}
          {entry.notifiedAt && (
            <span className="inline-flex items-center gap-1 rounded-ir-sm px-2 py-0.5 text-[11px] font-semibold text-ir-muted">
              <BellIcon className="size-2.5" />
              Voters notified
            </span>
          )}
        </div>

        {/* Actions */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: only fences off card-click bubbling from the buttons inside, not a new interaction */}
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: same — stopPropagation only */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: same — stopPropagation only, no new behavior to make keyboard-reachable */}
        <div
          className="flex shrink-0 items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            className="flex items-center gap-1.5 rounded-ir-sm border border-ir-primary/40 px-3 py-1.5 text-xs font-medium text-ir-primary transition-colors duration-150 ease-ir-standard hover:bg-ir-primary-light/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
            href={editHref}
          >
            <PencilIcon className="size-3" />
            Edit
          </Link>

          {entry.isPublished ? (
            <button
              className="flex cursor-pointer items-center gap-1.5 rounded-ir-sm border border-ir-border px-3 py-1.5 text-xs font-medium text-ir-muted transition-colors duration-150 ease-ir-standard hover:border-ir-primary/30 hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:opacity-50"
              disabled={isPending}
              onClick={handleUnpublish}
              type="button"
            >
              <LockIcon className="size-3" />
              Unpublish
            </button>
          ) : (
            <button
              className="flex cursor-pointer items-center gap-1.5 rounded-ir-sm bg-ir-primary px-3 py-1.5 text-xs font-medium text-ir-primary-foreground shadow-ir-xs transition-colors duration-150 ease-ir-standard hover:bg-ir-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:opacity-50"
              disabled={isPending}
              onClick={handlePublish}
              type="button"
            >
              <GlobeIcon className="size-3" />
              Publish
            </button>
          )}

          <Button
            aria-label="Delete entry"
            className="text-ir-danger"
            disabled={isPending}
            onClick={() => setDeleteDialogOpen(true)}
            size="icon-xs"
            variant="ghost"
          >
            <TrashIcon />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="Delete"
        description={`Are you sure you want to delete "${entry.title}"? This action cannot be undone.`}
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
        title="Delete changelog entry"
        variant="destructive"
      />

      <div className="mt-3 flex gap-3">
        {entry.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          // biome-ignore lint/performance/noImgElement: dynamic S3/R2/local upload URL, not known at build time for next/image
          <img
            alt=""
            className="size-14 shrink-0 rounded-ir-sm border border-ir-border object-cover"
            src={entry.coverImageUrl}
          />
        )}
        <div className="min-w-0">
          {/* Title */}
          <h3 className="text-base font-semibold leading-snug text-ir-heading">
            {entry.title}
          </h3>

          {/* Excerpt */}
          {excerpt && (
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ir-muted">
              {excerpt}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ir-muted">
        {entry.publishedAt && (
          <span>{format(entry.publishedAt, "MMM d, yyyy")}</span>
        )}
        {entry.linkedPostCount > 0 && (
          <span>
            {entry.linkedPostCount} linked post
            {entry.linkedPostCount === 1 ? "" : "s"}
          </span>
        )}
        {!entry.isPublished && !entry.publishedAt && (
          <span className="italic">Not yet published</span>
        )}
      </div>
    </div>
  );
}
