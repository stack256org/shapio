import {
  MapTrifoldIcon as MapTrifold,
  MegaphoneIcon as Megaphone,
  PlusIcon as Plus,
  UsersThreeIcon as UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentType } from "react";

interface QuickActionsProps {
  addFeedbackHref: string | null;
  isAdminOrOwner: boolean;
  workspaceSlug: string;
}

interface QuickAction {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}

export function QuickActions({
  addFeedbackHref,
  isAdminOrOwner,
  workspaceSlug,
}: QuickActionsProps) {
  const actions: QuickAction[] = [
    ...(addFeedbackHref
      ? [{ href: addFeedbackHref, icon: Plus, label: "Add Feedback" }]
      : []),
    {
      href: `/${workspaceSlug}/settings/roadmap`,
      icon: MapTrifold,
      label: "Manage Roadmap",
    },
    {
      href: `/${workspaceSlug}/settings/changelog`,
      icon: Megaphone,
      label: "Manage Changelog",
    },
    ...(isAdminOrOwner
      ? [
          {
            href: `/${workspaceSlug}/settings/members`,
            icon: UsersThree,
            label: "Invite Members",
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map(({ href, icon: Icon, label }) => (
        <Link
          className="group flex items-center gap-3 rounded-ir-card border border-ir-border bg-ir-surface px-4 py-3.5 shadow-ir-xs transition-all duration-150 ease-ir-standard hover:border-ir-primary/30 hover:shadow-ir-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
          href={href}
          key={href}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-ir-sm bg-ir-primary-light/20 text-ir-primary transition-colors duration-150 ease-ir-standard group-hover:bg-ir-primary group-hover:text-ir-primary-foreground">
            <Icon className="size-4" />
          </div>
          <span className="truncate text-sm font-medium text-ir-heading">
            {label}
          </span>
        </Link>
      ))}
    </div>
  );
}
