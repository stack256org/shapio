"use client";

import {
  ArrowLeft,
  Buildings,
  CaretLeft,
  CaretRight,
  CaretUpDown,
  ChartBar,
  Flag,
  List,
  Plugs,
  Scroll,
  SignOut,
  UserCircle,
  Users,
} from "@phosphor-icons/react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ComponentType, useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SquareAvatar } from "@/components/ui/square-avatar";
import { PRODUCT_NAME } from "@/config/platform";
import { useIsMobile } from "@/hooks/use-mobile";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/orbit", label: "Overview", icon: ChartBar, exact: true },
  {
    href: "/orbit/workspaces",
    label: "Workspaces",
    icon: Buildings,
    exact: false,
  },
  { href: "/orbit/users", label: "Users", icon: Users, exact: false },
  {
    href: "/orbit/feature-flags",
    label: "Feature Flags",
    icon: Flag,
    exact: false,
  },
  {
    href: "/orbit/integrations",
    label: "Integrations",
    icon: Plugs,
    exact: false,
  },
  { href: "/orbit/audit-log", label: "Audit Log", icon: Scroll, exact: false },
  { href: "/orbit/account", label: "Account", icon: UserCircle, exact: true },
];

// Shared active-indicator layoutId — the bar smoothly slides between nav rows.
const NAV_INDICATOR_ID = "orbit-nav-active-indicator";

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

// Floating rail-edge toggle — mirrors WorkspaceSidebar's SidebarEdgeToggle so
// both sidebars share the same collapse affordance.
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
      className="-right-3 absolute top-14 z-30 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-ir-border bg-ir-surface text-ir-muted shadow-ir-xs transition-colors duration-150 ease-ir-standard hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
      onClick={onClick}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      type="button"
    >
      <Caret className="size-3" weight="bold" />
    </button>
  );
}

export function AdminSidebar({
  email,
  image,
  workspaceSlug,
}: {
  email: string;
  image?: string | null;
  workspaceSlug?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Desktop-only, persisted across sessions. Read after mount to avoid an
  // SSR/client markup mismatch (localStorage isn't available on the server).
  useEffect(() => {
    if (localStorage.getItem("orbit-sidebar-collapsed") === "1") {
      setCollapsed(true);
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("orbit-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  // The mobile drawer always shows full labels — collapsing only applies to
  // the persistent desktop rail.
  const effectiveCollapsed = collapsed && !isMobile;

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is a watch-only trigger, not read in the body
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <>
      {/* Brand — the collapse control lives in the floating edge toggle
          instead, matching the workspace sidebar. */}
      <div
        className={cn(
          "flex h-14 items-center gap-3 border-b border-sidebar-border",
          effectiveCollapsed ? "justify-center px-0" : "px-5"
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-ir-sm bg-sidebar-primary font-black text-sidebar-primary-foreground text-xs">
          IR
        </span>
        {!effectiveCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="font-black text-sm leading-none">{PRODUCT_NAME}</p>
            <p className="mt-1 text-2xs font-semibold uppercase tracking-ui text-sidebar-foreground/40">
              Platform Admin
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <LayoutGroup id="orbit-nav">
        <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-5">
          <div className="space-y-0.5">
            {navItems.map(({ href, label, icon, exact }) => (
              <NavLink
                collapsed={effectiveCollapsed}
                exact={exact}
                href={href}
                icon={icon}
                key={href}
              >
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </LayoutGroup>

      {/* Footer */}
      <div className="border-t border-sidebar-border">
        {/* My Workspace quick link */}
        {workspaceSlug && (
          <div className="border-b border-sidebar-border px-2.5 py-2">
            <Link
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-ir-sm text-xs font-semibold text-sidebar-foreground/85 transition-colors duration-150 ease-ir-standard hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40",
                effectiveCollapsed ? "justify-center px-0 py-2" : "px-3 py-2"
              )}
              href={`/${workspaceSlug}`}
              title={effectiveCollapsed ? "My Workspace" : undefined}
            >
              <ArrowLeft className="size-3.5 shrink-0" size={13} />
              {!effectiveCollapsed && <span>My Workspace</span>}
            </Link>
          </div>
        )}

        {/* Account dropdown */}
        <DropdownMenu onOpenChange={setAccountOpen} open={accountOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex h-14 w-full min-w-0 cursor-pointer items-center gap-2.5 text-left transition-colors duration-150 ease-ir-standard hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40",
                effectiveCollapsed ? "justify-center px-0" : "px-4"
              )}
              title={effectiveCollapsed ? email : undefined}
              type="button"
            >
              <SquareAvatar
                alt={email}
                className="shrink-0 rounded-full"
                fallback={email.charAt(0).toUpperCase()}
                imageUrl={image}
              />
              {!effectiveCollapsed && (
                <>
                  <span
                    className="min-w-0 flex-1 truncate text-xs text-sidebar-foreground/70"
                    title={email}
                  >
                    {email}
                  </span>
                  <motion.span
                    animate={{ rotate: accountOpen ? 180 : 0 }}
                    className="shrink-0 text-sidebar-foreground/60"
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.15,
                      ease: "easeOut",
                    }}
                  >
                    <CaretUpDown className="size-4" />
                  </motion.span>
                </>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-64 max-w-[calc(100vw-1rem)]"
            side={effectiveCollapsed ? "right" : "top"}
            sideOffset={6}
          >
            <DropdownMenuLabel className="flex items-center gap-2.5 font-normal normal-case tracking-normal">
              <SquareAvatar
                alt={email}
                className="rounded-full"
                fallback={email.charAt(0).toUpperCase()}
                imageUrl={image}
              />
              <span
                className="flex-1 truncate text-xs font-medium text-ir-heading"
                title={email}
              >
                {email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/orbit/account">
                <UserCircle />
                Account
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await signOut();
                router.push("/signin");
              }}
              variant="destructive"
            >
              <SignOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground">
          <SheetTrigger asChild>
            <motion.button
              aria-label="Open navigation"
              className="flex cursor-pointer items-center justify-center rounded-ir-sm p-1 text-sidebar-foreground/90 transition-colors duration-150 ease-ir-standard hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
            >
              <List size={20} />
            </motion.button>
          </SheetTrigger>
          <span className="flex-1 truncate text-sm font-semibold">
            {PRODUCT_NAME} — Platform Admin
          </span>
        </div>

        <SheetContent
          className="flex w-72 flex-col border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
          showCloseButton={false}
          side="left"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Platform admin navigation menu</SheetDescription>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "relative flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-150 ease-ir-standard",
        effectiveCollapsed ? "w-16" : "w-64 lg:w-72"
      )}
    >
      {sidebarContent}
      <SidebarEdgeToggle collapsed={collapsed} onClick={toggleCollapsed} />
    </aside>
  );
}
