"use client";

import {
  BookOpenIcon,
  CaretDownIcon,
  ChartBarIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FEATURE_LINKS = [
  {
    icon: SquaresFourIcon,
    label: "Feedback Boards",
    tagline: "One place for every feature request",
    href: "/features/feedback-boards",
  },
  {
    icon: ChartBarIcon,
    label: "Public Roadmap",
    tagline: "Your roadmap updates itself",
    href: "/features/roadmap",
  },
  {
    icon: BookOpenIcon,
    label: "Changelog",
    tagline: "Every voter hears from you automatically",
    href: "/features/changelog",
  },
] as const;

export function NavFeaturesDropdown() {
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger className="flex items-center gap-1 rounded-ir-sm px-3 py-2 text-xs font-semibold tracking-ui text-ir-muted uppercase transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface hover:text-ir-heading">
        Features
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          className="flex"
          transition={{
            duration: shouldReduceMotion ? 0 : 0.15,
            ease: "easeOut",
          }}
        >
          <CaretDownIcon aria-hidden="true" className="size-3.5" />
        </motion.span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72 p-1.5" sideOffset={8}>
        {FEATURE_LINKS.map(({ icon: Icon, label, tagline, href }) => (
          <DropdownMenuItem
            asChild
            className="items-start gap-3 px-3 py-3 font-normal normal-case tracking-normal not-last:mb-0"
            key={label}
          >
            <Link href={href}>
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-ir-sm bg-ir-primary-light/15 text-ir-primary">
                <Icon aria-hidden="true" className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ir-heading">{label}</p>
                <p className="mt-0.5 text-xs leading-4 font-normal text-ir-muted">
                  {tagline}
                </p>
              </div>
            </Link>
          </DropdownMenuItem>
        ))}

        <div className="-mx-1.5 -mb-1.5 mt-1 border-t border-ir-border px-4 py-3">
          <DropdownMenuItem
            asChild
            className="p-0 font-semibold tracking-ui text-ir-muted data-focus:bg-transparent hover:text-ir-heading"
          >
            <Link href="/features">All Features →</Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
