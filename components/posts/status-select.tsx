"use client";

import {
  ArrowSquareOutIcon,
  CaretUpDownIcon,
  CheckIcon,
  CircleDashedIcon,
  FileIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { useState, useTransition } from "react";
import {
  publishPostAction,
  unpublishPostAction,
  updatePostStatusAction,
} from "@/app/actions/posts";
import { PostStatusBadge } from "@/components/posts/post-status-badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface WorkspaceStatus {
  color: string;
  id: string;
  isArchived: boolean;
  isSystem: boolean;
  name: string;
  slug: string;
}

interface StatusSelectProps {
  canEdit: boolean;
  currentStatus: string;
  // Publication state (posts.isDraft), distinct from the workflow status. When
  // true the "Draft" option is selected; picking a workflow status publishes.
  isDraft: boolean;
  postId: string;
  workspaceId: string;
  workspaceStatuses: WorkspaceStatus[];
}

// Sentinel for the Draft publication state in the same popover as the workflow
// statuses. Underscored so it can never collide with a real status slug.
const DRAFT_VALUE = "__draft__";

// Icon per status, matched by slug — no other status UI in the app uses icons
// yet, so this is intentionally local rather than a shared convention. Only
// covers the 5 current defaults; any other slug (a custom status, or an
// existing workspace still on the pre-Upvoty-parity status set) falls back
// to a plain color dot below rather than breaking.
const STATUS_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  [DRAFT_VALUE]: FileIcon,
  draft: FileIcon,
  in_review: MagnifyingGlassIcon,
  in_progress: CircleDashedIcon,
  completed: CheckIcon,
  declined: XIcon,
};

function StatusIcon({
  className,
  color,
  slug,
}: {
  className: string;
  color: string;
  slug: string;
}) {
  const Icon = STATUS_ICONS[slug];
  if (Icon) {
    return <Icon className={className} />;
  }
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full", className)}
      style={{ backgroundColor: color, transform: "scale(0.45)" }}
    />
  );
}

export default function StatusSelect({
  postId,
  workspaceId,
  currentStatus,
  isDraft,
  canEdit,
  workspaceStatuses,
}: StatusSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // System statuses (currently just the protected "Draft" fallback) never get
  // their own picker entry — a post auto-migrated onto one displays as the
  // same "Draft" sentinel below, so it doesn't show up twice.
  const activeStatuses = workspaceStatuses.filter(
    (s) => !s.isArchived && !s.isSystem
  );
  const isOnSystemDraftStatus = workspaceStatuses.some(
    (s) => s.isSystem && s.slug === currentStatus
  );
  const currentEffectiveValue =
    isDraft || isOnSystemDraftStatus ? DRAFT_VALUE : currentStatus;

  // Same deeply-nested-client-component problem useSectionPortalHref solves
  // in open-portal-button.tsx: derive the workspace slug from the URL
  // instead of threading a new prop through PostsTable -> PostRow (and
  // post-detail-content.tsx already has other slug-based links, but this
  // avoids a prop-signature change on the one call site that doesn't). Both
  // the admin and public-portal routes that render this component have the
  // workspace slug as their first path segment.
  const workspaceSlug = pathname.split("/").filter(Boolean)[0] ?? "";

  // The trigger previously ignored status color entirely (flat
  // bg-ir-muted-surface for every status) — now it tints like the read-only
  // PostStatusBadge does. The unpublished-draft sentinel always uses the
  // warning color (matches its own read-only badge above); any real
  // workflow status — including the system Draft fallback — uses its own
  // configured color. color-mix (not a hex+alpha string) so this works
  // whether the color is a raw hex from the DB or a CSS var() reference.
  const currentWorkspaceStatus =
    workspaceStatuses.find((s) => s.slug === currentStatus) ?? null;
  const triggerColor = isDraft
    ? "var(--ir-warning)"
    : (currentWorkspaceStatus?.color ?? "var(--ir-text-heading)");
  const triggerLabel =
    isDraft || isOnSystemDraftStatus
      ? "Draft"
      : (currentWorkspaceStatus?.name ?? currentStatus);
  const triggerIconSlug =
    isDraft || isOnSystemDraftStatus ? DRAFT_VALUE : currentStatus;

  // Reserve width for the longest label this trigger could ever show, so
  // switching statuses (e.g. "In Review" -> "Completed") resizes nothing —
  // every sibling after it in the flex-wrap header row (category, assignee,
  // byline, dates) would otherwise reflow horizontally on every change. `ch`
  // scales with font size rather than the viewport; the +8 covers the pill's
  // own padding plus the leading icon and trailing caret.
  const longestStatusLabel = Math.max(
    "Draft".length,
    ...activeStatuses.map((s) => s.name.length)
  );
  const statusTriggerMinWidth = `${longestStatusLabel + 8}ch`;

  // Applies a picked status immediately — no staged value, no separate save
  // step. The popover closes right away; the mutation runs in the background.
  function handleSelect(value: string) {
    setOpen(false);

    if (value === DRAFT_VALUE) {
      // Already draft — either unpublished, or auto-migrated onto the system
      // Draft status — so no unnecessary update.
      if (isDraft || isOnSystemDraftStatus) {
        return;
      }
      // Published → revert to draft, reusing the existing publish/draft flow.
      startTransition(async () => {
        await unpublishPostAction({ postId, workspaceId });
        router.refresh();
      });
      return;
    }

    // A workflow status was chosen.
    if (isDraft) {
      // Upvoty parity: picking a workflow status on a draft publishes it into
      // that status. Set the status first (only if it changed), then publish.
      startTransition(async () => {
        if (value !== currentStatus) {
          await updatePostStatusAction({ postId, workspaceId, status: value });
        }
        await publishPostAction({ postId, workspaceId });
        router.refresh();
      });
      return;
    }

    // Published post: plain status change.
    if (value === currentStatus) {
      return;
    }
    startTransition(async () => {
      await updatePostStatusAction({ postId, workspaceId, status: value });
      router.refresh();
    });
  }

  if (!canEdit) {
    if (isDraft) {
      return (
        <span className="inline-flex items-center rounded-ir-full bg-ir-warning/10 px-2 py-0.5 text-[11px] font-medium text-ir-warning">
          Draft
        </span>
      );
    }
    return (
      <PostStatusBadge
        status={currentStatus}
        workspaceStatuses={workspaceStatuses}
      />
    );
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex h-7 items-center gap-1.5 rounded-ir-md border-0 px-2.5 text-xs font-medium transition-colors duration-150 ease-ir-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
          disabled={isPending}
          style={{
            backgroundColor: `color-mix(in oklab, ${triggerColor} 9%, transparent)`,
            color: triggerColor,
            minWidth: statusTriggerMinWidth,
          }}
          type="button"
        >
          <StatusIcon
            className="size-3.5 shrink-0"
            color={triggerColor}
            slug={triggerIconSlug}
          />
          <span className="flex-1 truncate text-left">{triggerLabel}</span>
          <CaretUpDownIcon className="size-3.5 shrink-0 opacity-70" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-64 flex-col gap-0 p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Status list — clicking an option applies it immediately */}
        <div className="flex flex-col gap-0.5 p-2">
          {/* Draft (publication state) first, matching Upvoty. */}
          <button
            className={cn(
              "flex cursor-pointer items-center gap-2.5 rounded-ir-sm px-3 py-2 text-left text-sm font-medium transition-colors duration-150 ease-ir-standard disabled:cursor-not-allowed disabled:opacity-50",
              currentEffectiveValue === DRAFT_VALUE
                ? "bg-ir-primary-light/20 text-ir-primary"
                : "text-ir-heading hover:bg-ir-muted-surface"
            )}
            disabled={isPending}
            onClick={() => handleSelect(DRAFT_VALUE)}
            type="button"
          >
            <StatusIcon
              className="size-3.5 shrink-0"
              color="var(--ir-warning)"
              slug={DRAFT_VALUE}
            />
            Draft
          </button>

          {activeStatuses.map((s) => {
            const isSelected = currentEffectiveValue === s.slug;
            return (
              <button
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-ir-sm px-3 py-2 text-left text-sm font-medium transition-colors duration-150 ease-ir-standard disabled:cursor-not-allowed disabled:opacity-50",
                  isSelected
                    ? "bg-ir-primary-light/20 text-ir-primary"
                    : "text-ir-heading hover:bg-ir-muted-surface"
                )}
                disabled={isPending}
                key={s.slug}
                onClick={() => handleSelect(s.slug)}
                type="button"
              >
                <StatusIcon
                  className="size-3.5 shrink-0"
                  color={s.color}
                  slug={s.slug}
                />
                {s.name}
              </button>
            );
          })}
        </div>

        {/* Edit Statuses */}
        <div className="border-t border-ir-border p-2.5">
          <Link
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading"
            href={`/${workspaceSlug}/settings/statuses`}
          >
            Edit Statuses
            <ArrowSquareOutIcon className="size-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
