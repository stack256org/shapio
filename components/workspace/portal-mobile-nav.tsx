"use client";

import { ListIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface PortalMobileNavProps {
  active?: "roadmap" | "changelog";
  changelogPublic: boolean;
  isMember: boolean;
  roadmapPublic: boolean;
  slug: string;
}

// Small mobile-only nav drawer for the public portal header — the Roadmap
// and Changelog links are otherwise `hidden sm:flex` and unreachable on
// narrow viewports without this.
export function PortalMobileNav({
  slug,
  roadmapPublic,
  changelogPublic,
  isMember,
  active,
}: PortalMobileNavProps) {
  const [open, setOpen] = useState(false);
  const showRoadmap = roadmapPublic || isMember;
  const showChangelog = changelogPublic || isMember;

  if (!showRoadmap && !showChangelog) {
    return null;
  }

  const linkClass = (isActive: boolean) =>
    `rounded-ir-sm px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-ir-standard ${
      isActive
        ? "bg-ir-primary-light/15 text-ir-primary"
        : "text-ir-muted hover:bg-ir-muted-surface hover:text-ir-heading"
    }`;

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        <Button
          aria-label="Open navigation"
          className="sm:hidden"
          size="icon-sm"
          variant="ghost"
        >
          <ListIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {showRoadmap && (
            <Link
              className={linkClass(active === "roadmap")}
              href={`/${slug}/roadmap`}
              onClick={() => setOpen(false)}
            >
              Roadmap
            </Link>
          )}
          {showChangelog && (
            <Link
              className={linkClass(active === "changelog")}
              href={`/${slug}/changelog`}
              onClick={() => setOpen(false)}
            >
              Changelog
            </Link>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
