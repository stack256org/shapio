"use client";

import {
  CaretLeft,
  CaretRight,
  CircleDashed,
  Code,
  List,
  MapTrifold,
  Megaphone,
  Shield,
  SquaresFour,
  Tag,
  Tray,
  Users,
} from "@phosphor-icons/react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentType, useEffect, useState } from "react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AccountMenu } from "@/components/workspace/account-menu";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface WorkspaceOption {
  logoUrl: string | null;
  name: string;
  slug: string;
}

interface WorkspaceSidebarProps {
  email: string;
  initialUnreadCount?: number;
  isAdminOrOwner: boolean;
  isOrbitAdmin: boolean;
  userImage: string | null;
  workspaceLogoUrl: string | null;
  workspaceName: string;
  workspaceSlug: string;
  workspaces: WorkspaceOption[];
}

// Shared active-indicator layoutId — a single bar smoothly slides between
// whichever nav row (including the NotificationBell row) is currently active.
const NAV_INDICATOR_ID = "workspace-nav-active-indicator";

function NavLink({
  href,
  exact = false,
  icon: Icon,
  children,
  collapsed = false,
}: {
  children: string;
  collapsed?: boolean;
  exact?: boolean;
  href: string;
  icon: ComponentType<{ className?: string; weight?: "regular" | "fill" }>;
}) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      className={cn(
        "group relative flex cursor-pointer items-center gap-2.5 rounded-ir-md text-sm transition-colors duration-150 ease-ir-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40",
        collapsed ? "justify-center px-0 py-2" : "px-3 py-2",
        isActive
          ? "bg-ir-primary/15 font-medium text-ir-primary"
          : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      )}
      href={href}
      title={collapsed ? children : undefined}
    >
      {isActive && (
        <motion.span
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-ir-primary"
          layoutId={NAV_INDICATOR_ID}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 500, damping: 40 }
          }
        />
      )}
      <Icon
        className="size-4 shrink-0"
        weight={isActive ? "fill" : "regular"}
      />
      {!collapsed && <span className="truncate">{children}</span>}
    </Link>
  );
}

// Floating rail-edge toggle — same button, same position for both
// directions. Swaps between CaretLeft/CaretRight rather than rotating a
// single glyph 180° — Phosphor's caret icons carry asymmetric padding for
// inline text use, so a rotated glyph drifts off-center in one of the two
// states; swapping keeps each glyph's own (correctly balanced) artwork.
function SidebarEdgeToggle({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  const Caret = collapsed ? CaretRight : CaretLeft;

  return (
    <button
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="-right-3 absolute top-14 z-30 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-ir-border bg-base-100 text-ir-muted shadow-ir-xs transition-colors duration-150 ease-ir-standard hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
      onClick={onClick}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      type="button"
    >
      <Caret className="size-3" weight="bold" />
    </button>
  );
}

export function WorkspaceSidebar({
  email,
  initialUnreadCount = 0,
  isAdminOrOwner,
  isOrbitAdmin,
  userImage,
  workspaceLogoUrl,
  workspaceName,
  workspaceSlug,
  workspaces,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Desktop-only, persisted across sessions. Read after mount to avoid an
  // SSR/client markup mismatch (localStorage isn't available on the server).
  useEffect(() => {
    if (localStorage.getItem("workspace-sidebar-collapsed") === "1") {
      setCollapsed(true);
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("workspace-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  // The mobile drawer always shows full labels — collapsing only applies to
  // the persistent desktop rail.
  const effectiveCollapsed = collapsed && !isMobile;

  // Close the mobile drawer whenever the route changes (link clicks navigate
  // without unmounting this layout-persisted client component).
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is a watch-only trigger, not read in the body
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <>
      <WorkspaceSwitcher
        collapsed={effectiveCollapsed}
        currentLogoUrl={workspaceLogoUrl}
        currentName={workspaceName}
        currentSlug={workspaceSlug}
        workspaces={workspaces}
      />

      {/* Navigation */}
      <LayoutGroup id="workspace-nav">
        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2.5">
          {/* Dashboard + Notifications inbox */}
          <div className="space-y-0.5">
            <NavLink
              collapsed={effectiveCollapsed}
              exact
              href={`/${workspaceSlug}`}
              icon={SquaresFour}
            >
              Dashboard
            </NavLink>
            <NotificationBell
              collapsed={effectiveCollapsed}
              indicatorId={NAV_INDICATOR_ID}
              initialCount={initialUnreadCount}
              workspaceSlug={workspaceSlug}
            />
          </div>

          {/* Feedback */}
          <div className="mt-5 space-y-0.5">
            {!effectiveCollapsed && (
              <p className="px-3 pt-2 pb-1.5 text-2xs font-semibold uppercase tracking-eyebrow text-sidebar-foreground/40">
                Feedback
              </p>
            )}
            <NavLink
              collapsed={effectiveCollapsed}
              href={`/${workspaceSlug}/feedback`}
              icon={Tray}
            >
              All Feedback
            </NavLink>
          </div>

          {/* Publish */}
          <div className="mt-5 space-y-0.5">
            {!effectiveCollapsed && (
              <p className="px-3 pt-2 pb-1.5 text-2xs font-semibold uppercase tracking-eyebrow text-sidebar-foreground/40">
                Publish
              </p>
            )}
            <NavLink
              collapsed={effectiveCollapsed}
              href={`/${workspaceSlug}/settings/roadmap`}
              icon={MapTrifold}
            >
              Roadmap
            </NavLink>
            <NavLink
              collapsed={effectiveCollapsed}
              href={`/${workspaceSlug}/settings/changelog`}
              icon={Megaphone}
            >
              Changelog
            </NavLink>
          </div>

          {/* Settings */}
          {isAdminOrOwner && (
            <div className="mt-3 space-y-0.5 border-t border-sidebar-border pt-3">
              {!effectiveCollapsed && (
                <p className="px-3 pt-1 pb-1.5 text-2xs font-semibold uppercase tracking-eyebrow text-sidebar-foreground/40">
                  Settings
                </p>
              )}
              <NavLink
                collapsed={effectiveCollapsed}
                href={`/${workspaceSlug}/settings/members`}
                icon={Users}
              >
                Members
              </NavLink>
              <NavLink
                collapsed={effectiveCollapsed}
                href={`/${workspaceSlug}/settings/categories`}
                icon={Tag}
              >
                Categories
              </NavLink>
              <NavLink
                collapsed={effectiveCollapsed}
                href={`/${workspaceSlug}/settings/statuses`}
                icon={CircleDashed}
              >
                Statuses
              </NavLink>
              <NavLink
                collapsed={effectiveCollapsed}
                href={`/${workspaceSlug}/settings/embed`}
                icon={Code}
              >
                Embed
              </NavLink>
            </div>
          )}
        </nav>
      </LayoutGroup>

      {/* Platform Admin quick link (admins only) */}
      {isOrbitAdmin && (
        <div className="border-t border-sidebar-border px-2.5 py-2">
          <motion.div
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          >
            <Link
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-ir-md text-xs font-semibold text-sidebar-foreground/70 transition-colors duration-150 ease-ir-standard hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40",
                effectiveCollapsed ? "justify-center px-0 py-2" : "px-3 py-2"
              )}
              href="/orbit"
              title={effectiveCollapsed ? "Platform Admin" : undefined}
            >
              <Shield className="size-3.5 shrink-0" />
              {!effectiveCollapsed && <span>Platform Admin</span>}
            </Link>
          </motion.div>
        </div>
      )}

      {/* User bar — click account name to open the settings menu. Styled to
          mirror the workspace switcher at the top of the sidebar. */}
      <div className="shrink-0">
        <AccountMenu
          collapsed={effectiveCollapsed}
          email={email}
          isAdminOrOwner={isAdminOrOwner}
          userImage={userImage}
          workspaceSlug={workspaceSlug}
        />
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4">
          <SheetTrigger asChild>
            <motion.button
              aria-label="Open navigation"
              className="flex cursor-pointer items-center justify-center rounded-ir-sm p-1 text-sidebar-foreground/90 transition-colors duration-150 ease-ir-standard hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
            >
              <List className="size-5" />
            </motion.button>
          </SheetTrigger>
          <span
            className="flex-1 truncate text-sm font-semibold text-sidebar-foreground"
            title={workspaceName}
          >
            {workspaceName}
          </span>
        </div>

        <SheetContent
          className="flex w-72 flex-col border-sidebar-border bg-sidebar p-0"
          showCloseButton={false}
          side="left"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Workspace navigation menu</SheetDescription>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "relative flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-150 ease-ir-standard",
        collapsed ? "w-16" : "w-56 lg:w-60"
      )}
    >
      {sidebarContent}
      <SidebarEdgeToggle collapsed={collapsed} onClick={toggleCollapsed} />
    </aside>
  );
}
