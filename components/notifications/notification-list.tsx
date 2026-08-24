"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { NotificationEmptyState } from "@/components/notifications/notification-empty-state";
import { NotificationItem } from "@/components/notifications/notification-item";
import { useNotificationsContext } from "@/components/notifications/notifications-context";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SetPageHeader } from "@/components/workspace/topbar";
import type { NotificationListItem } from "@/lib/notifications/queries";
import { cn } from "@/lib/utils";

interface NotificationListProps {
  hasMore: boolean;
  initialItems: NotificationListItem[];
  total: number;
  workspaceId: string;
}

type FilterTab = "all" | "unread";

export function NotificationList({
  initialItems,
  hasMore: initialHasMore,
  total: initialTotal,
  workspaceId,
}: NotificationListProps) {
  const notificationsCtx = useNotificationsContext();
  const [items, setItems] = useState<NotificationListItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearTarget, setClearTarget] = useState<NotificationListItem | null>(
    null
  );
  const [isClearingOne, setIsClearingOne] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  // Deleting a single notification is irreversible and easy to trigger by
  // mistake with a stray hover-click, so it's confirmed here rather than
  // removed the instant the row's icon is clicked.
  function handleConfirmClearOne() {
    if (!clearTarget) {
      return;
    }
    const target = clearTarget;
    setIsClearingOne(true);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/notifications/${target.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          throw new Error("Failed to remove notification");
        }
        setItems((prev) => prev.filter((n) => n.id !== target.id));
        setTotal((prev) => Math.max(0, prev - 1));
        if (!target.isRead) {
          notificationsCtx?.decrementUnread(1);
        }
      } catch {
        toast.error("Failed to remove notification");
      } finally {
        setIsClearingOne(false);
        setClearTarget(null);
      }
    });
  }

  function handleMarkAllRead() {
    // Optimistic: flip every row to read and clear the shared badge right
    // away, then confirm with the server in the background. Roll back only
    // if the request actually fails — this is what keeps the count "always
    // synchronized" instead of waiting on the next poll or a page refresh.
    const previousItems = items;
    const previousUnread = notificationsCtx?.unreadCount;
    const markedCount = previousItems.filter((n) => !n.isRead).length;
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    notificationsCtx?.setUnreadCount(0);

    startTransition(async () => {
      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId }),
        });
        if (!res.ok) {
          throw new Error("Failed to mark all notifications as read");
        }
        toast.success(
          markedCount > 0
            ? `${markedCount} notification${markedCount === 1 ? "" : "s"} marked as read`
            : "All notifications marked as read"
        );
      } catch {
        setItems(previousItems);
        if (previousUnread !== undefined) {
          notificationsCtx?.setUnreadCount(previousUnread);
        }
        toast.error("Failed to mark all as read");
      }
    });
  }

  function handleClearAll() {
    const previousItems = items;
    const previousTotal = total;
    const previousUnread = notificationsCtx?.unreadCount;

    // Optimistic: empty the list and badge immediately so the empty state
    // and sidebar count update on this click, not on the next round trip.
    setItems([]);
    setTotal(0);
    setHasMore(false);
    notificationsCtx?.setUnreadCount(0);
    setIsClearing(true);

    startTransition(async () => {
      try {
        const res = await fetch("/api/notifications", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId }),
        });
        if (!res.ok) {
          throw new Error("Failed to clear notifications");
        }
        toast.success("All notifications cleared");
      } catch {
        setItems(previousItems);
        setTotal(previousTotal);
        setHasMore(initialHasMore);
        if (previousUnread !== undefined) {
          notificationsCtx?.setUnreadCount(previousUnread);
        }
        toast.error("Failed to clear notifications");
      } finally {
        setIsClearing(false);
        setClearConfirmOpen(false);
      }
    });
  }

  function handleLoadMore() {
    startTransition(async () => {
      try {
        const nextPage = page + 1;
        const res = await fetch(`/api/notifications?page=${nextPage}&limit=30`);
        if (!res.ok) {
          throw new Error("Failed to load more notifications");
        }
        const data = await res.json();
        setItems((prev) => [...prev, ...data.notifications]);
        setHasMore(data.hasMore);
        setPage(nextPage);
      } catch {
        toast.error("Failed to load more notifications");
      }
    });
  }

  const unreadCount = items.filter((n) => !n.isRead).length;
  const visibleItems =
    filter === "unread" ? items.filter((n) => !n.isRead) : items;

  // Group notifications by recency (Today / This week / Earlier). Items arrive
  // already sorted newest-first, so each group preserves that order.
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
  const groups: { label: string; items: NotificationListItem[] }[] = [
    { label: "Today", items: [] },
    { label: "This week", items: [] },
    { label: "Earlier", items: [] },
  ];
  for (const n of visibleItems) {
    const t = new Date(n.createdAt).getTime();
    if (t >= startOfToday) {
      groups[0].items.push(n);
    } else if (t >= startOfWeek) {
      groups[1].items.push(n);
    } else {
      groups[2].items.push(n);
    }
  }
  const visibleGroups = groups.filter((g) => g.items.length > 0);
  const showToolbar = items.length > 0;

  return (
    <div>
      {/* Reports title/description/toolbar up to the shared, layout-owned
          Topbar (see components/workspace/topbar.tsx) instead of rendering a
          second sticky header locally — this page used to render its own
          "Notifications" heading + toolbar here, which duplicated and
          visually overlapped the Topbar's own sticky bar. */}
      <SetPageHeader
        actions={
          showToolbar ? (
            <>
              {unreadCount > 0 && (
                <Button
                  disabled={isPending}
                  onClick={handleMarkAllRead}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Mark all as read
                </Button>
              )}
              <Button
                className="hover:bg-ir-danger/10 hover:text-ir-danger"
                disabled={isPending}
                onClick={() => setClearConfirmOpen(true)}
                size="sm"
                type="button"
                variant="ghost"
              >
                Clear all
              </Button>
            </>
          ) : undefined
        }
        beforeActions={
          showToolbar ? (
            // biome-ignore lint/a11y/useSemanticElements: a <fieldset> pulls in native form/legend semantics that don't fit a standalone toggle group outside a <form>
            <div
              aria-label="Filter notifications"
              className="join shrink-0"
              role="group"
            >
              <button
                aria-pressed={filter === "all"}
                className={cn(
                  "join-item btn flex h-9 min-h-9 min-w-20 shrink-0 cursor-pointer items-center justify-center rounded-field px-4 text-xs font-semibold tracking-ui whitespace-nowrap uppercase shadow-none transition-all duration-150 ease-ir-standard focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100",
                  filter === "all"
                    ? "btn-primary"
                    : "btn-outline border-base-300 bg-base-100 text-ir-muted hover:border-primary/30 hover:bg-base-200 hover:text-ir-heading"
                )}
                onClick={() => setFilter("all")}
                type="button"
              >
                All
              </button>
              <button
                aria-pressed={filter === "unread"}
                className={cn(
                  "join-item btn flex h-9 min-h-9 min-w-20 shrink-0 cursor-pointer items-center justify-center rounded-field px-4 text-xs font-semibold tracking-ui whitespace-nowrap uppercase shadow-none transition-all duration-150 ease-ir-standard focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100",
                  filter === "unread"
                    ? "btn-primary"
                    : "btn-outline border-base-300 bg-base-100 text-ir-muted hover:border-primary/30 hover:bg-base-200 hover:text-ir-heading"
                )}
                onClick={() => setFilter("unread")}
                type="button"
              >
                Unread
                {unreadCount > 0 && (
                  <span
                    className={cn(
                      "badge badge-sm ml-1.5 h-[18px] min-w-[18px] rounded-md border-transparent px-1 text-2xs font-semibold",
                      filter === "unread"
                        ? "bg-primary-content/20 text-primary-content"
                        : "badge-primary bg-primary/15 text-primary"
                    )}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          ) : undefined
        }
        description={
          total > 0 ? (
            <>
              {total} notification{total === 1 ? "" : "s"}
              {unreadCount > 0 && (
                <span className="ml-1.5 font-medium text-ir-primary">
                  · {unreadCount} unread
                </span>
              )}
            </>
          ) : (
            "Updates on the feedback you're following."
          )
        }
        title="Notifications"
      />

      {/* List — wrapped in the same bordered surface card every other
          ContentContainer page uses (settings forms, account page, etc.),
          so this page's body reads as a panel on the workspace canvas
          instead of leaving the canvas color exposed directly under the
          sticky header. The list itself scrolls inside this card (rather
          than the whole page growing tall) so the Today/This week/Earlier
          labels can stick to the top of the card as their group scrolls
          underneath, like a mail client's date dividers. */}
      <div className="mt-4 max-h-[70vh] overflow-y-auto rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
        {items.length === 0 ? (
          <NotificationEmptyState />
        ) : visibleGroups.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-ir-muted">
              You're all caught up — no unread notifications.
            </p>
          </div>
        ) : (
          <>
            {visibleGroups.map((group) => (
              <div key={group.label}>
                <p className="sticky top-0 z-20 [will-change:transform] border-b border-ir-border/60 bg-ir-surface px-5 py-2 text-xs font-semibold tracking-widest text-base-content/50 uppercase">
                  {group.label}
                </p>
                <div className="divide-y divide-ir-border/60">
                  {group.items.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={handleRead}
                      onRequestClear={setClearTarget}
                    />
                  ))}
                </div>
              </div>
            ))}

            {hasMore && filter === "all" && (
              <div className="px-4 pt-2 pb-6 text-center">
                <Button
                  disabled={isPending}
                  onClick={handleLoadMore}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {isPending ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        confirmLabel="Clear All"
        description={`Remove all ${total} notification${total === 1 ? "" : "s"}? This cannot be undone.`}
        isPending={isClearing}
        onConfirm={handleClearAll}
        onOpenChange={setClearConfirmOpen}
        open={clearConfirmOpen}
        title="Clear all notifications"
        variant="destructive"
      />

      <ConfirmDialog
        confirmLabel="Remove"
        description={`Remove "${clearTarget?.title}"? This cannot be undone.`}
        isPending={isClearingOne}
        onConfirm={handleConfirmClearOne}
        onOpenChange={(open) => !open && setClearTarget(null)}
        open={!!clearTarget}
        title="Remove notification"
        variant="destructive"
      />
    </div>
  );
}
