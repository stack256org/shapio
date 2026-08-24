"use client";

import {
  ArrowRight,
  Bell,
  CornerDownRight,
  FileText,
  MailOpen,
  Megaphone,
  MessageCircle,
  MessageCircleWarning,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useNotificationsContext } from "@/components/notifications/notifications-context";
import { RelativeTime } from "@/components/ui/relative-time";
import type { NotificationType } from "@/db/schema/notifications";
import type { NotificationListItem } from "@/lib/notifications/queries";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  new_post: FileText,
  status_change: ArrowRight,
  new_comment: MessageCircle,
  reply: CornerDownRight,
  pending_comment: MessageCircleWarning,
  invite_accepted: UserCheck,
  member_removed: UserX,
  changelog_published: Megaphone,
  assignment: UserPlus,
};

const REMOVED_MESSAGE =
  "This item is no longer available because it has been removed.";

interface NotificationItemProps {
  notification: NotificationListItem;
  onRead: (id: string) => void;
  onRequestClear: (notification: NotificationListItem) => void;
}

export function NotificationItem({
  notification,
  onRead,
  onRequestClear,
}: NotificationItemProps) {
  const Icon = TYPE_ICONS[notification.type as NotificationType] ?? Bell;
  const isRead = notification.isRead;
  const isRemoved = notification.targetMissing;
  const notificationsCtx = useNotificationsContext();

  // Marks read without navigating (used by both opening the notification and
  // the hover "mark as read" action). Decrementing the shared context here —
  // not just the list's local state — is what makes the sidebar bell update
  // on the same click instead of the next poll.
  function markRead() {
    if (!isRead) {
      onRead(notification.id);
      notificationsCtx?.decrementUnread(1);
      fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
      }).catch(() => {
        // best-effort; the list already reflects the optimistic update
      });
    }
  }

  function handleRemovedClick() {
    markRead();
    toast(REMOVED_MESSAGE);
  }

  // Only opens the confirmation dialog (owned by NotificationList) — the
  // actual delete happens on confirm, so a mis-click can't silently disappear
  // a notification with no way to know where it went.
  function handleRequestClear(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onRequestClear(notification);
  }

  function handleMarkReadClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    markRead();
  }

  return (
    <article
      className={cn(
        "group relative flex items-center gap-4 px-5 py-3 transition-colors duration-150 ease-ir-standard",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-ir-primary/40",
        isRead
          ? "hover:bg-base-200/60"
          : "bg-ir-primary/5 hover:bg-ir-primary/10"
      )}
    >
      {/* Icon */}
      <span
        className={cn(
          "relative flex size-12 shrink-0 items-center justify-center rounded-xl",
          isRemoved
            ? "bg-base-200 text-base-content/40"
            : "bg-base-200 text-base-content/70"
        )}
      >
        <Icon className="size-5" />
        {!isRead && !isRemoved && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-ir-primary ring-2 ring-ir-surface"
          />
        )}
      </span>

      {/* Content — the title itself is the single real navigation target,
          stretched via ::after to cover the whole row so the entire row
          stays clickable without nesting interactive elements. */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {isRemoved ? (
            <button
              className="cursor-pointer text-left text-base font-semibold leading-snug text-ir-muted after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
              onClick={handleRemovedClick}
              type="button"
            >
              {notification.title}
            </button>
          ) : (
            <Link
              className={cn(
                "text-base leading-snug font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none",
                isRead ? "text-base-content/60" : "text-ir-heading"
              )}
              href={notification.link}
              onClick={markRead}
            >
              {notification.title}
            </Link>
          )}
          {isRemoved && (
            <span className="badge mt-0.5 h-auto shrink-0 border-transparent bg-ir-muted-surface px-2 py-0.5 text-2xs font-medium tracking-wide text-ir-muted uppercase">
              Removed
            </span>
          )}
        </div>
        {notification.body && !isRemoved && (
          <p className="mt-1 line-clamp-1 text-sm text-base-content/70">
            {notification.body}
          </p>
        )}
        {isRemoved && (
          <p className="mt-1 text-sm text-base-content/60">{REMOVED_MESSAGE}</p>
        )}
      </div>

      {/* Time + hover actions — Gmail-style: a persistent timestamp plus
          mark as read (unread only) and clear, layered above the stretched
          title link so the buttons stay clickable. The action group stays
          in flow but `invisible` until hover (rather than `hidden`) so it
          keeps reserving its width — the row doesn't reflow when the icons
          reveal themselves. */}
      <div className="relative z-10 flex shrink-0 items-center gap-2">
        <RelativeTime
          className="text-xs whitespace-nowrap text-base-content/60"
          date={notification.createdAt}
          options={{ addSuffix: true }}
        />
        <div className="invisible flex shrink-0 items-center gap-1 group-hover:visible">
          {!isRead && !isRemoved && (
            <button
              aria-label="Mark as read"
              className="flex size-7 cursor-pointer items-center justify-center rounded-ir-sm text-ir-muted transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
              onClick={handleMarkReadClick}
              title="Mark as read"
              type="button"
            >
              <MailOpen className="size-3.5" />
            </button>
          )}
          <button
            aria-label="Remove notification"
            className="flex size-7 cursor-pointer items-center justify-center rounded-ir-sm text-ir-muted transition-colors duration-150 ease-ir-standard hover:bg-ir-danger/10 hover:text-ir-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
            onClick={handleRequestClear}
            title="Remove notification"
            type="button"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
