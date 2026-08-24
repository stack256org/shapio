"use client";

import { Bell } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotificationsContext } from "@/components/notifications/notifications-context";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  collapsed?: boolean;
  indicatorId?: string;
  initialCount?: number;
  workspaceSlug: string;
}

export function NotificationBell({
  workspaceSlug,
  initialCount = 0,
  indicatorId,
  collapsed = false,
}: NotificationBellProps) {
  const shouldReduceMotion = useReducedMotion();
  // Shared with the notifications page via NotificationsProvider (mounted in
  // the workspace layout) so opening/reading/clearing notifications there
  // updates this badge on the same render — no separate poll, no refresh.
  // Falls back to the server-rendered initialCount if ever rendered outside
  // the provider.
  const notificationsCtx = useNotificationsContext();
  const unreadCount = notificationsCtx?.unreadCount ?? initialCount;
  const pathname = usePathname();
  const isActive = pathname.startsWith(`/${workspaceSlug}/notifications`);

  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Link
      className={cn(
        "group relative flex cursor-pointer items-center gap-2.5 rounded-ir-sm text-sm transition-colors duration-150 ease-ir-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40",
        collapsed ? "justify-center px-0 py-2" : "px-3 py-2",
        isActive
          ? "bg-ir-primary/15 font-medium text-ir-primary"
          : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      )}
      href={`/${workspaceSlug}/notifications`}
      title={collapsed ? "Notifications" : undefined}
    >
      {isActive && indicatorId && (
        <motion.span
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-ir-primary"
          layoutId={indicatorId}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 500, damping: 40 }
          }
        />
      )}
      <span className="relative inline-flex size-4 shrink-0 items-center justify-center overflow-visible">
        <Bell className="size-4" weight={isActive ? "fill" : "regular"} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -top-1.5 -right-1.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-ir-full bg-ir-danger px-0.5 text-2xs leading-none font-bold text-white"
              exit={shouldReduceMotion ? undefined : { scale: 0, opacity: 0 }}
              initial={shouldReduceMotion ? false : { scale: 0, opacity: 0 }}
              key={displayCount}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 500, damping: 25 }
              }
            >
              {displayCount}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {!collapsed && <span className="truncate">Notifications</span>}
    </Link>
  );
}
