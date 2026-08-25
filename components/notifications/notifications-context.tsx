"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface NotificationsValue {
  decrementUnread: (by?: number) => void;
  refresh: () => void;
  setUnreadCount: (count: number) => void;
  unreadCount: number;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

// Returns null when rendered outside a provider so consumers can fall back to
// their own prop-driven value instead of crashing.
export function useNotificationsContext() {
  return useContext(NotificationsContext);
}

// Single source of truth for the unread count, shared between the sidebar
// bell and the notifications page. One 30s poll lives here instead of one
// per consumer, and any mutation (read/mark-all/clear-all) updates this
// state directly so every consumer reflects it on the same render — no
// waiting for the next poll tick.
export function NotificationsProvider({
  initialUnreadCount = 0,
  children,
}: {
  initialUnreadCount?: number;
  children: ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (document.visibilityState === "hidden") {
      return;
    }
    try {
      const res = await fetch("/api/notifications/count");
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // network failure — keep previous count
    }
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);

  const value = useMemo<NotificationsValue>(
    () => ({
      unreadCount,
      setUnreadCount,
      decrementUnread: (by = 1) =>
        setUnreadCount((count) => Math.max(0, count - by)),
      refresh,
    }),
    [unreadCount, refresh]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
