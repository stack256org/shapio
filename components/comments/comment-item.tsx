"use client";

import {
  ArrowBendDownRightIcon,
  PencilIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { useIsEmbed } from "@/components/embed/use-is-embed";
import { FeedbackBody } from "@/components/posts/feedback-body";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RelativeTime } from "@/components/ui/relative-time";
import { embedFetch } from "@/lib/embed/fetch";
import {
  useEmbedCommentOwnership,
  useEmbedIsModerator,
} from "@/lib/embed/personalization-context";
import { useEmbedSignedIn } from "@/lib/embed/use-embed-signed-in";
import CommentEditForm from "./comment-edit-form";
import CommentReactions from "./comment-reactions";
import type { CommentApi, CommentData, ReplyData } from "./types";

function getInitials(name: string | null): string {
  if (!name) {
    return "?";
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0]!.charAt(0).toUpperCase();
  }
  return (
    parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)
  ).toUpperCase();
}

interface CommentItemProps {
  api?: CommentApi;
  canModerate: boolean;
  comment: CommentData | ReplyData;
  depth?: number;
  isLocked: boolean;
  isReplyOpen?: boolean;
  isSignedIn: boolean;
  onDelete: (commentId: string) => void;
  onReply?: () => void;
}

export default function CommentItem({
  api,
  comment,
  canModerate,
  isLocked,
  isReplyOpen = false,
  isSignedIn,
  depth = 0,
  onReply,
  onDelete,
}: CommentItemProps) {
  const commentBaseUrl = api?.commentBaseUrl ?? "/api/comments";
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Local copy of the body so an inline edit shows immediately (optimistic).
  const [body, setBody] = useState(comment.body);

  // Server-rendered `isSignedIn`/`comment.isOwn` are computed from a cookie
  // session, always false/false for an embed visitor authenticated via
  // bearer token — correct them the same way VoteButton/EmbedNav already do
  // (see lib/embed/personalization-context.tsx and
  // lib/embed/use-embed-signed-in.ts). No-op outside the embed.
  const isEmbed = useIsEmbed();
  const [signedIn] = useEmbedSignedIn(isEmbed, isSignedIn);
  const isOwn = useEmbedCommentOwnership(comment.id, comment.isOwn);
  // `canModerate` is also cookie-derived (getWorkspaceMember via
  // getCurrentSession), always false for a bearer-authenticated embed
  // visitor even if they really are a workspace admin/owner. Corrected here
  // for the moderator-delete privilege only — the pending-approval queue
  // itself still requires the server to have fetched unapproved comments in
  // the first place (gated on the SAME uncorrected canModerate at query
  // time), which this client-side correction can't retroactively provide;
  // that's a known, tracked follow-up, not something this fixes.
  const isModerator = useEmbedIsModerator(canModerate);

  const displayName = comment.isDeleted
    ? "Deleted"
    : (comment.authorName ?? "User");
  const initials = getInitials(comment.authorName);

  const canDelete =
    !comment.isDeleted && (isModerator || (signedIn && !!comment.authorName));
  // Only the comment's own author may edit it (never a moderator).
  const canEdit = signedIn && isOwn && !comment.isDeleted;
  // Replying to a deleted comment stays allowed — the thread is preserved
  // (Feature 07), so a deleted comment keeps its place as a valid reply target.
  const canReply = depth === 0 && !isLocked && onReply;
  const isPending = !comment.isApproved && !comment.isDeleted;

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
      <div
        className={`flex gap-3 py-3.5 ${depth === 0 ? "border-b border-ir-border last:border-0" : ""}`}
      >
        {/* Avatar */}
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ir-muted-surface text-xs font-semibold text-ir-muted ${depth === 1 ? "size-6" : "size-7"} ${comment.isDeleted ? "opacity-50" : ""}`}
        >
          {comment.authorAvatar && !avatarFailed ? (
            // biome-ignore lint/performance/noImgElement: dynamic user-uploaded avatar URL, not known at build time for next/image
            // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError is an image-load fallback, not a user interaction
            <img
              alt={displayName}
              className={`object-cover ${depth === 1 ? "size-6" : "size-7"}`}
              onError={() => setAvatarFailed(true)}
              src={comment.authorAvatar}
            />
          ) : (
            initials
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex flex-wrap items-baseline gap-2">
            <span
              className={`text-xs font-medium ${comment.isDeleted ? "italic text-ir-muted" : "text-ir-heading"}`}
            >
              {displayName}
            </span>
            {isPending && (
              <span className="rounded-ir-full border border-ir-warning/40 px-1.5 text-2xs tracking-wide text-ir-warning uppercase">
                Pending
              </span>
            )}
            <span className="text-xs text-ir-muted">
              <RelativeTime
                date={comment.createdAt}
                options={{ addSuffix: true }}
              />
            </span>
          </div>

          {/* Body — Quill HTML, sanitized on render (strips scripts / event
              handlers, keeps formatting + images). Swaps to an inline editor
              when the author is editing. */}
          {comment.isDeleted ? (
            <p className="mt-1 text-sm leading-relaxed text-ir-muted italic">
              This comment has been deleted.
            </p>
          ) : isEditing ? (
            <CommentEditForm
              api={api}
              commentId={comment.id}
              initialBody={body}
              onCancel={() => setIsEditing(false)}
              onSaved={(newBody) => {
                setBody(newBody);
                setIsEditing(false);
              }}
            />
          ) : (
            <FeedbackBody
              body={body}
              className="mt-1 text-sm leading-relaxed text-ir-body wrap-break-word"
            />
          )}

          {/* Reactions — hidden while editing and on deleted comments */}
          {!comment.isDeleted && !isEditing && (
            <CommentReactions
              api={api}
              commentId={comment.id}
              initialReactions={comment.reactions}
              isSignedIn={isSignedIn}
            />
          )}

          {/* Actions — hidden while editing */}
          {!isEditing && (canReply || canEdit || canDelete) && (
            <div className="mt-2 flex items-center gap-3">
              {canReply && (
                <button
                  aria-expanded={isReplyOpen}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                  onClick={onReply}
                  type="button"
                >
                  <ArrowBendDownRightIcon className="size-3" />
                  Reply
                </button>
              )}
              {canEdit && (
                <button
                  className="inline-flex cursor-pointer items-center gap-1 text-xs text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                  onClick={() => setIsEditing(true)}
                  type="button"
                >
                  <PencilIcon className="size-3" />
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  aria-label="Delete comment"
                  className="inline-flex cursor-pointer items-center gap-1 text-xs text-ir-danger transition-opacity duration-150 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                  onClick={() => setShowDeleteDialog(true)}
                  type="button"
                >
                  <TrashIcon className="size-3" />
                  Delete
                </button>
              )}
            </div>
          )}
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
