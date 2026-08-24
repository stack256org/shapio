import type { PostStatus } from "@/lib/posts/constants";

export const STATUS_LABEL: Record<PostStatus, string> = {
  open: "Open",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
};

export const STATUS_CLASSES: Record<PostStatus, string> = {
  open: "bg-ir-muted-surface text-ir-muted",
  under_review: "bg-ir-primary-light/15 text-ir-primary",
  planned: "bg-ir-primary-light/15 text-ir-primary",
  in_progress: "bg-ir-warning/10 text-ir-warning",
  completed: "bg-ir-success/10 text-ir-success",
  closed: "bg-ir-muted-surface text-ir-muted/70",
};

interface WorkspaceStatus {
  color: string;
  name: string;
  slug: string;
}

interface PostStatusBadgeProps {
  status: string;
  workspaceStatuses?: WorkspaceStatus[];
}

export function PostStatusBadge({
  status,
  workspaceStatuses,
}: PostStatusBadgeProps) {
  // Use workspace status if available for custom label/color
  if (workspaceStatuses) {
    const ws = workspaceStatuses.find((s) => s.slug === status);
    if (ws) {
      return (
        <span
          className="inline-flex items-center gap-1 rounded-ir-full px-2 py-0.5 text-[11px] font-medium"
          style={{
            backgroundColor: `${ws.color}18`,
            color: ws.color,
          }}
        >
          {ws.name}
        </span>
      );
    }
  }

  // Fallback to hardcoded labels for known statuses
  const label = STATUS_LABEL[status as PostStatus] ?? status.replace(/_/g, " ");
  const classes =
    STATUS_CLASSES[status as PostStatus] ?? "bg-ir-muted-surface text-ir-muted";

  return (
    <span
      className={`inline-flex items-center rounded-ir-full px-2 py-0.5 text-[11px] font-medium ${classes}`}
    >
      {label}
    </span>
  );
}
