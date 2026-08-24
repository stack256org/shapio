"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { PAGE_PADDING } from "@/components/ui/page";
import { OpenPortalButton } from "@/components/workspace/open-portal-button";
import { cn } from "@/lib/utils";

export interface PageHeaderState {
  actions?: ReactNode;
  // Set only by pages that need a back-arrow instead of a plain heading
  // (New Feedback, New/Edit Changelog Entry, post detail). Topbar owns how
  // this renders — pages just supply the URL; `title` stays the semantic
  // page title either way (it becomes the link's visible text).
  backHref?: string;
  // Rendered before OpenPortalButton — e.g. a search box that needs to lead
  // the action cluster, preserving today's left-to-right order.
  beforeActions?: ReactNode;
  description?: ReactNode;
  // Intercepts a `backHref` click — e.g. to confirm discarding unsaved
  // changes before leaving an editor. Receives `proceed`; call it to
  // continue the navigation (immediately, or after the user confirms),
  // don't call it to cancel. Omit for a plain, unguarded back-link.
  onBeforeBack?: (proceed: () => void) => void;
  // Overrides OpenPortalButton's own pathname-based guess for pages editing
  // one specific public-facing item (e.g. a changelog entry) — that guess
  // only has the URL to go on, so it can't know things like "this entry is
  // still a draft and has no public page yet." Leave unset to use the normal
  // workspace/section default; pass an href to point at that exact item;
  // pass `null` to hide the button entirely (nothing sensible to open).
  portalHref?: string | null;
  title?: ReactNode;
}

interface HeaderActions {
  defaultHeader: PageHeaderState;
  setHeader: Dispatch<SetStateAction<PageHeaderState>>;
  setSlots: Dispatch<SetStateAction<HeaderSlots>>;
}

interface HeaderSlots {
  actionsSlot: HTMLDivElement | null;
  beforeActionsSlot: HTMLDivElement | null;
}

const EMPTY_SLOTS: HeaderSlots = { actionsSlot: null, beforeActionsSlot: null };

// Split into two contexts on purpose: HeaderStateContext holds the current
// header (only Topbar reads it), HeaderActionsContext holds the stable
// setter + default (only SetPageHeader reads it). Bundling both into one
// context object would give SetPageHeader's effect a dependency (`ctx`) that
// changes identity every time ANY page calls setHeader — including from
// inside its own effect — which reruns the effect, which calls setHeader
// again, forever ("Maximum update depth exceeded"). Keeping the write side
// referentially stable across header changes is what breaks that loop.
const HeaderStateContext = createContext<PageHeaderState | null>(null);
const HeaderActionsContext = createContext<HeaderActions | null>(null);
// The real DOM nodes Topbar renders for `beforeActions`/`actions` — see
// SetPageHeader below for why their content is portaled into these rather
// than passed through HeaderStateContext like the rest of the header.
const HeaderSlotsContext = createContext<HeaderSlots>(EMPTY_SLOTS);

// `defaultHeader` comes from the layout (workspace name/description). It's
// the initial state AND what SetPageHeader restores on unmount, so
// navigating away from a page never leaves a stale or blank header showing.
// Keyed by the caller on workspace identity (see layout.tsx) so switching
// workspaces remounts this with a fresh seed instead of carrying over the
// previous workspace's default.
export function TopbarProvider({
  children,
  defaultHeader,
}: {
  children: ReactNode;
  defaultHeader: PageHeaderState;
}) {
  const [header, setHeader] = useState<PageHeaderState>(defaultHeader);
  const [slots, setSlots] = useState<HeaderSlots>(EMPTY_SLOTS);
  const actions = useMemo<HeaderActions>(
    () => ({ setHeader, defaultHeader, setSlots }),
    [defaultHeader]
  );
  return (
    <HeaderStateContext.Provider value={header}>
      <HeaderActionsContext.Provider value={actions}>
        <HeaderSlotsContext.Provider value={slots}>
          {children}
        </HeaderSlotsContext.Provider>
      </HeaderActionsContext.Provider>
    </HeaderStateContext.Provider>
  );
}

// Rendered once by the workspace layout, above {children}. The account
// avatar + menu live in the sidebar footer (see AccountMenu in
// account-menu.tsx) — not duplicated here.
export function Topbar() {
  const header = useContext(HeaderStateContext);
  const headerActions = useContext(HeaderActionsContext);
  const router = useRouter();

  // Registers the real `beforeActions`/`actions` DOM containers so
  // SetPageHeader — mounted wherever the calling page put it in the tree,
  // not here — can portal its content into them. A plain callback ref
  // (rather than useRef) so the containers make it into state, and
  // therefore into HeaderSlotsContext, the moment they mount.
  const setBeforeActionsSlot = useCallback(
    (node: HTMLDivElement | null) => {
      headerActions?.setSlots((prev) =>
        prev.beforeActionsSlot === node
          ? prev
          : { ...prev, beforeActionsSlot: node }
      );
    },
    [headerActions]
  );
  const setActionsSlot = useCallback(
    (node: HTMLDivElement | null) => {
      headerActions?.setSlots((prev) =>
        prev.actionsSlot === node ? prev : { ...prev, actionsSlot: node }
      );
    },
    [headerActions]
  );

  if (!header?.title) {
    return null;
  }

  const backLinkClassName =
    "inline-flex items-center gap-1.5 text-lg font-semibold text-ir-heading transition-colors duration-150 ease-ir-standard hover:text-ir-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40";

  const titleContent = header.backHref ? (
    header.onBeforeBack ? (
      <button
        className={backLinkClassName}
        onClick={() =>
          header.onBeforeBack?.(() => router.push(header.backHref!))
        }
        type="button"
      >
        <ArrowLeftIcon className="size-4 shrink-0" />
        {header.title}
      </button>
    ) : (
      <Link className={backLinkClassName} href={header.backHref}>
        <ArrowLeftIcon className="size-4 shrink-0" />
        {header.title}
      </Link>
    )
  ) : (
    <h1 className="text-lg font-semibold text-ir-heading">{header.title}</h1>
  );

  return (
    <div
      className={cn(
        "sticky top-0 z-20 border-b border-ir-border bg-base-100",
        PAGE_PADDING
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          {titleContent}
          {header.description && (
            <p className="mt-1 text-sm text-ir-muted">{header.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* display:contents so an empty container never eats a flex gap
              slot before its portaled content (if any) arrives. */}
          <div className="contents" ref={setBeforeActionsSlot} />
          <OpenPortalButton override={header.portalHref} />
          <div className="contents" ref={setActionsSlot} />
        </div>
      </div>
    </div>
  );
}

// Rendered by a page/segment layout to report its header content up to the
// layout-owned Topbar. Resets to the workspace default on unmount so the
// next page never briefly shows this page's title/actions before its own
// SetPageHeader (or a loading.tsx boundary) takes over.
//
// `actions`/`beforeActions` are portaled into Topbar's slot containers
// instead of being handed to Topbar through HeaderStateContext like the rest
// of the header fields. Topbar renders in the workspace layout, above (i.e.
// outside) whatever tree the calling page — and this component — sit in; a
// page's `actions` often depend on that page's own local context (state,
// providers). Passing the element itself through context would re-parent it
// under Topbar when Topbar renders `header.actions`, severing it from that
// context. A portal keeps SetPageHeader as its React parent (so context
// lookups still resolve) while only redirecting *where* it paints in the DOM.
export function SetPageHeader({
  title,
  description,
  actions,
  beforeActions,
  backHref,
  onBeforeBack,
  portalHref,
}: PageHeaderState) {
  const ctx = useContext(HeaderActionsContext);
  const slots = useContext(HeaderSlotsContext);

  useLayoutEffect(() => {
    if (!ctx) {
      return;
    }
    ctx.setHeader({ title, description, backHref, onBeforeBack, portalHref });
    return () => ctx.setHeader(ctx.defaultHeader);
  }, [ctx, title, description, backHref, onBeforeBack, portalHref]);

  return (
    <>
      {beforeActions && slots.beforeActionsSlot
        ? createPortal(beforeActions, slots.beforeActionsSlot)
        : null}
      {actions && slots.actionsSlot
        ? createPortal(actions, slots.actionsSlot)
        : null}
    </>
  );
}
