"use client";

import {
  Bell,
  CaretUpDown,
  Moon,
  Scroll,
  Shield,
  SignOut,
  Sliders,
  Sun,
  UserCircle,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SquareAvatar } from "@/components/ui/square-avatar";
import { cn } from "@/lib/utils";

interface AccountMenuProps {
  collapsed?: boolean;
  email: string;
  isAdminOrOwner: boolean;
  userImage: string | null;
  workspaceSlug: string;
}

// Dropdown body for the sidebar's account bar.
function AccountMenuDropdownContent({
  email,
  isAdminOrOwner,
  userImage,
  workspaceSlug,
  align = "start",
  side = "top",
  variant = "topbar",
}: Omit<AccountMenuProps, "collapsed"> & {
  align?: "start" | "end";
  side?: "top" | "bottom";
  variant?: "sidebar" | "topbar";
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  // The sidebar is a fixed "always dark" surface (bg-sidebar, independent of
  // the light/dark toggle below) — daisyUI's theme-reactive base-* tokens
  // don't reliably match its shade, which read as a visibly different box
  // floating on the sidebar instead of blending into it. The topbar's menu
  // sits over the theme-following main content, so it keeps the daisyUI
  // tokens from DropdownMenuContent's own defaults unchanged.
  const isSidebar = variant === "sidebar";

  const itemClass = (href: string) =>
    cn(
      isSidebar &&
        "not-data-[variant=destructive]:data-focus:bg-sidebar-accent",
      pathname.startsWith(href) &&
        "bg-ir-primary-light/20 text-ir-primary focus:bg-ir-primary-light/20 focus:text-ir-primary"
    );

  return (
    <DropdownMenuContent
      align={align}
      className={cn(
        "w-64 max-w-[calc(100vw-1rem)]",
        isSidebar && "border-sidebar-border bg-sidebar text-sidebar-foreground"
      )}
      side={side}
      sideOffset={6}
    >
      <DropdownMenuLabel className="flex items-center gap-2.5 font-normal normal-case tracking-normal">
        <SquareAvatar
          alt={email}
          className="rounded-full"
          fallback={email.charAt(0).toUpperCase()}
          imageUrl={userImage}
        />
        <span
          className={cn(
            "flex-1 truncate text-xs font-medium",
            isSidebar ? "text-sidebar-foreground" : "text-ir-heading"
          )}
          title={email}
        >
          {email}
        </span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator className={cn(isSidebar && "bg-sidebar-border")} />

      {isAdminOrOwner && (
        <>
          <DropdownMenuGroup>
            <DropdownMenuItem
              asChild
              className={itemClass(`/${workspaceSlug}/settings/general`)}
            >
              <Link href={`/${workspaceSlug}/settings/general`}>
                <Sliders />
                General
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className={itemClass(`/${workspaceSlug}/settings/moderation`)}
            >
              <Link href={`/${workspaceSlug}/settings/moderation`}>
                <Shield />
                Moderation
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className={itemClass(`/${workspaceSlug}/settings/audit-log`)}
            >
              <Link href={`/${workspaceSlug}/settings/audit-log`}>
                <Scroll />
                Audit Log
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator
            className={cn(isSidebar && "bg-sidebar-border")}
          />
        </>
      )}

      <DropdownMenuGroup>
        <DropdownMenuItem
          asChild
          className={itemClass(`/${workspaceSlug}/settings/notifications`)}
        >
          <Link href={`/${workspaceSlug}/settings/notifications`}>
            <Bell />
            Notification Preferences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className={itemClass(`/${workspaceSlug}/settings/account`)}
        >
          <Link href={`/${workspaceSlug}/settings/account`}>
            <UserCircle />
            Account
          </Link>
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator className={cn(isSidebar && "bg-sidebar-border")} />
      <DropdownMenuGroup>
        <DropdownMenuLabel
          className={cn(isSidebar && "text-sidebar-foreground/60")}
        >
          Theme
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup onValueChange={setTheme} value={theme}>
          <DropdownMenuRadioItem
            className={cn(
              isSidebar &&
                "not-data-[state=checked]:data-focus:bg-sidebar-accent"
            )}
            value="light"
          >
            <Sun />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className={cn(
              isSidebar &&
                "not-data-[state=checked]:data-focus:bg-sidebar-accent"
            )}
            value="dark"
          >
            <Moon />
            Dark
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuGroup>

      <DropdownMenuSeparator className={cn(isSidebar && "bg-sidebar-border")} />
      <DropdownMenuItem onClick={() => logoutAction()} variant="destructive">
        <SignOut />
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

export function AccountMenu({
  email,
  isAdminOrOwner,
  userImage,
  workspaceSlug,
  collapsed = false,
}: AccountMenuProps) {
  const shouldReduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex h-14 w-full min-w-0 cursor-pointer items-center gap-2.5 border-t border-sidebar-border text-left transition-colors duration-150 ease-ir-standard hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40",
            collapsed ? "justify-center px-0" : "px-4"
          )}
          title={collapsed ? email : undefined}
          type="button"
        >
          <SquareAvatar
            alt={email}
            className="shrink-0 rounded-full"
            fallback={email.charAt(0).toUpperCase()}
            imageUrl={userImage}
          />
          {!collapsed && (
            <>
              <span
                className="min-w-0 flex-1 truncate text-sm font-medium text-sidebar-foreground"
                title={email}
              >
                {email}
              </span>
              <motion.span
                animate={{ rotate: open ? 180 : 0 }}
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

      <AccountMenuDropdownContent
        email={email}
        isAdminOrOwner={isAdminOrOwner}
        userImage={userImage}
        variant="sidebar"
        workspaceSlug={workspaceSlug}
      />
    </DropdownMenu>
  );
}
