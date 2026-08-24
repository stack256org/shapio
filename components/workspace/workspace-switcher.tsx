"use client";

import { Check, Plus } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SquareAvatar } from "@/components/ui/square-avatar";
import { cn } from "@/lib/utils";

interface WorkspaceOption {
  logoUrl: string | null;
  name: string;
  slug: string;
}

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
  currentLogoUrl: string | null;
  currentName: string;
  currentSlug: string;
  workspaces: WorkspaceOption[];
}

export function WorkspaceSwitcher({
  currentLogoUrl,
  currentName,
  currentSlug,
  workspaces,
  collapsed = false,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);

  const avatar = (
    <SquareAvatar
      alt={currentName}
      className="shrink-0 rounded-ir-md bg-ir-primary text-ir-primary-foreground"
      fallback={
        <span className="text-xs font-black">
          {currentName.charAt(0).toUpperCase()}
        </span>
      }
      imageUrl={currentLogoUrl}
    />
  );

  return (
    <div className="flex h-14 w-full min-w-0 items-center border-b border-sidebar-border">
      <DropdownMenu onOpenChange={setOpen} open={open}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex h-14 min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left transition-colors duration-150 ease-ir-standard hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40",
              collapsed ? "justify-center px-0" : "pr-4 pl-2"
            )}
            title={collapsed ? currentName : undefined}
            type="button"
          >
            {avatar}
            {!collapsed && (
              <span
                className="min-w-0 flex-1 truncate text-sm font-semibold text-sidebar-foreground"
                title={currentName}
              >
                {currentName}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
          side="bottom"
          sideOffset={4}
        >
          <DropdownMenuGroup>
            {workspaces.map((ws) => {
              const isCurrent = ws.slug === currentSlug;

              return (
                <DropdownMenuItem
                  asChild
                  className={`normal-case tracking-normal ${
                    isCurrent
                      ? "bg-ir-primary-light/20 text-ir-primary focus:bg-ir-primary-light/20 focus:text-ir-primary"
                      : ""
                  }`}
                  key={ws.slug}
                >
                  <Link href={`/${ws.slug}`}>
                    {/* Let the fallback letter use SquareAvatar's own muted
                        color against its light idle background — the item's
                        universal focus rule (**:text-ir-primary) recolors it
                        on hover, same as every other dropdown in the app.
                        Forcing it to text-sidebar-foreground (meant for the
                        dark sidebar trigger) made it invisible here:
                        near-white text on the avatar's light
                        bg-ir-muted-surface square. */}
                    <SquareAvatar
                      alt={ws.name}
                      className="size-5 shrink-0 rounded-ir-md text-2xs font-semibold"
                      fallback={ws.name.charAt(0).toUpperCase()}
                      imageUrl={ws.logoUrl}
                    />
                    <span className="flex-1 truncate text-sm" title={ws.name}>
                      {ws.name}
                    </span>
                    {isCurrent && <Check className="size-3.5 shrink-0" />}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href="/onboarding?new=1">
              <Plus />
              Create workspace
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
