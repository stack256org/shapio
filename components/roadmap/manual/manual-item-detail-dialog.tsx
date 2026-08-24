"use client";

import {
  CalendarBlankIcon,
  PencilIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { FeedbackBody } from "@/components/posts/feedback-body";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImagePreviewThumbnail } from "@/components/ui/image-preview-thumbnail";
import type { BoardItem } from "./manual-roadmap-card";

interface ManualItemDetailDialogProps {
  canManage: boolean;
  item: BoardItem | null;
  onDelete?: (item: BoardItem) => void;
  onEdit?: (item: BoardItem) => void;
  onOpenChange: (open: boolean) => void;
}

function formatLaunch(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : format(d, "MMM d, yyyy");
}

// Read-only "view details" surface for manual roadmap items — there was no
// detail view at all before (cards were edit/delete-only for admins, inert
// for everyone else). Built entirely from data already loaded by the board,
// so it needs no new queries or server actions.
export function ManualItemDetailDialog({
  item,
  canManage,
  onOpenChange,
  onEdit,
  onDelete,
}: ManualItemDetailDialogProps) {
  const launch = item ? formatLaunch(item.launchDate) : null;

  return (
    <Dialog onOpenChange={onOpenChange} open={!!item}>
      <DialogContent className="max-h-[calc(100dvh-4rem)] overflow-y-auto sm:max-w-lg">
        {item && (
          <>
            {item.coverImage && (
              <ImagePreviewThumbnail
                className="-mx-6 -mt-6 mb-2 h-48 w-[calc(100%+3rem)] max-w-none rounded-t-ir-xl border-b border-ir-border object-cover"
                src={item.coverImage}
              />
            )}

            <DialogHeader>
              <DialogTitle>{item.title}</DialogTitle>
            </DialogHeader>

            {(launch || item.voteCount > 0 || item.commentCount > 0) && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-ir-muted">
                {launch && (
                  <span className="inline-flex items-center gap-1 rounded-ir-full bg-ir-primary-light/15 px-2 py-0.5 font-medium text-ir-primary">
                    <CalendarBlankIcon className="size-3" />
                    {launch}
                  </span>
                )}
                {item.voteCount > 0 && (
                  <span>
                    {item.voteCount} vote{item.voteCount === 1 ? "" : "s"}
                  </span>
                )}
                {item.commentCount > 0 && (
                  <span>
                    {item.commentCount} comment
                    {item.commentCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            )}

            {item.description ? (
              <FeedbackBody
                body={item.description}
                className="text-sm leading-relaxed text-ir-body"
              />
            ) : (
              <p className="text-sm text-ir-muted italic">No description.</p>
            )}

            {canManage && (onEdit || onDelete) && (
              <div className="flex items-center justify-end gap-2 border-t border-ir-border pt-4">
                {onDelete && (
                  <Button
                    onClick={() => {
                      onDelete(item);
                      onOpenChange(false);
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    <TrashIcon data-icon="inline-start" />
                    Delete
                  </Button>
                )}
                {onEdit && (
                  <Button
                    onClick={() => {
                      onEdit(item);
                      onOpenChange(false);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <PencilIcon data-icon="inline-start" />
                    Edit
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
