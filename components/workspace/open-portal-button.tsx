"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext } from "react";

// The current workspace's public-portal URL, resolved once in the workspace
// layout and shared with every page header so the "Open Public Portal" button
// can appear app-wide without each page recomputing it. `null` when the
// workspace has nothing public to open (no button is shown).
const PortalHrefContext = createContext<string | null>(null);

export function PortalHrefProvider({
  href,
  children,
}: {
  href: string | null;
  children: ReactNode;
}) {
  return (
    <PortalHrefContext.Provider value={href}>
      {children}
    </PortalHrefContext.Provider>
  );
}

export function usePortalHref() {
  return useContext(PortalHrefContext);
}

// The Roadmap and Changelog admin pages (and their sub-routes, e.g. New Entry
// / Edit Entry) always open THEIR OWN public page — not whatever the
// workspace-wide default resolves to — so "Open Public Portal" previews what
// you're actually editing. This works regardless of that section's own
// public/private toggle, the same way an admin can preview a hidden post
// themselves: the public route's own member bypass lets it render for them.
function useSectionPortalHref(): string | null {
  const pathname = usePathname();
  const [slug, area, section] = pathname.split("/").filter(Boolean);
  if (!slug || area !== "settings") {
    return null;
  }
  if (section === "roadmap") {
    return `/${slug}/roadmap`;
  }
  if (section === "changelog") {
    return `/${slug}/changelog`;
  }
  return null;
}

// Opens the workspace's public portal in a new tab. Rendered inside Topbar,
// so it shows up automatically on every admin page that sets a header.
// Renders nothing when there's no public surface to open. The label collapses
// to an icon-only control on mobile to stay compact in the header.
export function OpenPortalButton({
  override,
}: {
  // Set by a page (via SetPageHeader's portalHref) that knows better than a
  // pathname guess ever could — e.g. a specific changelog entry's own public
  // URL, or `null` while editing a draft that has no public URL yet.
  // `undefined` (the default, when the prop isn't passed) falls through to
  // the normal section/workspace resolution below.
  override?: string | null;
} = {}) {
  const defaultHref = usePortalHref();
  const sectionHref = useSectionPortalHref();
  const href = override === undefined ? (sectionHref ?? defaultHref) : override;
  if (!href) {
    return null;
  }
  return (
    <a
      aria-label="Open Public Portal"
      className="flex h-10 min-h-10 min-w-20 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-base-300 px-4 py-0 text-sm font-medium whitespace-nowrap text-ir-heading transition-all duration-200 hover:border-primary/30 hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <ArrowSquareOutIcon className="size-[18px] shrink-0" />
      <span className="hidden sm:inline">Open Public Portal</span>
    </a>
  );
}
