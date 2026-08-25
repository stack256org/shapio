"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface UnsavedChangesContextValue {
  // Wraps a "leave" action (a route change, a Cancel click, a back-link) so
  // it only runs immediately when nothing is dirty — otherwise it's held
  // until the shared confirm dialog resolves.
  guardNavigation: (action: () => void) => void;
  // Registers one form's dirty flag under a stable id. Multiple forms can be
  // dirty across the app at once (e.g. an accordion of settings cards); the
  // aggregate is what every guard below actually checks.
  setFormDirty: (id: string, dirty: boolean) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null
);

/**
 * Root-mounted (see components/providers.tsx) so it can guard navigation
 * that originates *outside* whichever form is dirty — sidebar links, the
 * account menu, the browser's Back/Forward buttons, a hard refresh — not
 * just the Cancel button / back-link the form renders itself. Individual
 * forms opt in via `useUnsavedChangesGuard` (hooks/use-unsaved-changes-guard.ts),
 * which registers their dirty state here and gets back the same
 * `guardNavigation` this provider uses internally, so there is exactly one
 * confirm dialog for the whole app.
 */
export function UnsavedChangesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const dirtyIdsRef = useRef(new Set<string>());
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  isDirtyRef.current = isDirty;

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const setFormDirty = useCallback((id: string, dirty: boolean) => {
    const ids = dirtyIdsRef.current;
    const had = ids.has(id);
    if (dirty === had) {
      return;
    }
    if (dirty) {
      ids.add(id);
    } else {
      ids.delete(id);
    }
    setIsDirty(ids.size > 0);
  }, []);

  const guardNavigation = useCallback((action: () => void) => {
    if (isDirtyRef.current) {
      pendingActionRef.current = action;
      setIsConfirmOpen(true);
    } else {
      action();
    }
  }, []);

  const confirmLeave = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    // Leaving is a deliberate choice to discard everything currently
    // unsaved, not just whichever form's link/button was clicked.
    dirtyIdsRef.current.clear();
    setIsDirty(false);
    setIsConfirmOpen(false);
    action?.();
  }, []);

  const cancelLeave = useCallback(() => {
    pendingActionRef.current = null;
    setIsConfirmOpen(false);
  }, []);

  // Hard navigation: refresh, close tab, typed URL, external link — the one
  // case a JS-driven modal can't intercept, so this falls back to the
  // browser's own native prompt.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirtyRef.current) {
        return;
      }
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // In-app link clicks anywhere in the app — sidebar, account menu, topbar,
  // breadcrumbs. Next.js client-side navigation never fires `beforeunload`,
  // and wrapping every <Link> individually is exactly the gap that let this
  // bug through in the first place, so this intercepts at the document level
  // instead: it catches every current and future nav link without each one
  // having to opt in.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!isDirtyRef.current) {
        return;
      }
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as HTMLElement)?.closest?.(
        "a[href]"
      ) as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute("download")) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") {
        return;
      }
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) {
        return;
      }
      const current = window.location.pathname + window.location.search;
      const next = url.pathname + url.search;
      if (next === current) {
        // Same-page hash link — nothing to lose.
        return;
      }
      e.preventDefault();
      const href = url.pathname + url.search + url.hash;
      guardNavigation(() => router.push(href));
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [guardNavigation, router]);

  // Browser Back/Forward: Next's router handles `popstate` itself for
  // client-side transitions (no reload, so `beforeunload` stays silent), and
  // there's no supported way to intercept that transition directly. Instead,
  // arm a duplicate history entry at the current URL while dirty — the first
  // Back press then lands on that duplicate (same URL, same page, nothing
  // unmounts) rather than the real previous page, which is what gives this
  // handler a chance to confirm before anything is actually lost.
  useEffect(() => {
    if (!isDirty) {
      return;
    }
    window.history.pushState(null, "", window.location.href);

    function handlePopState() {
      if (!isDirtyRef.current) {
        return;
      }
      // Re-arm immediately so a "Stay" choice (or a second Back press before
      // the dialog is answered) is caught the same way.
      window.history.pushState(null, "", window.location.href);
      guardNavigation(() => {
        // Skip the two entries this guard added (the arm above and this
        // re-arm) to reach the page actually being navigated to.
        window.history.go(-2);
      });
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isDirty, guardNavigation]);

  const value = useMemo(
    () => ({ guardNavigation, setFormDirty }),
    [guardNavigation, setFormDirty]
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <ConfirmDialog
        cancelLabel="Stay"
        confirmLabel="Leave without saving"
        description="If you leave this page, your unsaved changes will be lost."
        onConfirm={confirmLeave}
        onOpenChange={(open) => {
          if (!open) {
            cancelLeave();
          }
        }}
        open={isConfirmOpen}
        title="You have unsaved changes"
      />
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChangesContext() {
  return useContext(UnsavedChangesContext);
}
