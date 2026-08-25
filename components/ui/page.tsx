import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── Shared page layout system ────────────────────────────────────────────────
// One place that defines the app's content width and padding so every page
// reads as the same design system. The page header itself is owned by
// components/workspace/topbar.tsx (rendered once by the workspace layout) —
// use ContentContainer/PageBody here for the body below it.

// Standard horizontal + vertical page padding, applied by every wrapper here.
export const PAGE_PADDING = "px-4 py-3 sm:px-8";

interface ContentContainerProps {
  className?: string;
  children: ReactNode;
}

// The single, consistent reading/form column used across the product — post
// detail, editors, settings forms, notifications, etc. Centered with a fixed
// max width so every full-page form lines up at the same width regardless of
// viewport size. Data-heavy pages (tables, dashboards, kanban) use PageBody
// instead so they can fill the available width.
export function ContentContainer({ className, children }: ContentContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-5xl", PAGE_PADDING, className)}>
      {children}
    </div>
  );
}

// Same fixed-width reading/form column as ContentContainer, but left-aligned
// instead of centered — for Platform Admin pages, which hug the sidebar edge
// rather than center in the viewport.
export function ContentContainerLeft({ className, children }: ContentContainerProps) {
  return (
    <div className={cn("w-full max-w-5xl", PAGE_PADDING, className)}>
      {children}
    </div>
  );
}

interface PageBodyProps {
  className?: string;
  children: ReactNode;
}

// Full-width content region with the standard page padding — for data-heavy
// pages (tables, dashboards, kanban) that should fill the pane.
export function PageBody({ className, children }: PageBodyProps) {
  return <div className={cn(PAGE_PADDING, className)}>{children}</div>;
}
