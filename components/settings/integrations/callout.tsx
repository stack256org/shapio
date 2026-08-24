"use client";

import { InfoIcon, WarningIcon, XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CalloutProps {
  children: ReactNode;
  className?: string;
  /** Renders a close button and calls this when clicked. Omit for a non-dismissible callout. */
  onDismiss?: () => void;
  variant?: "info" | "warning";
}

const VARIANT_STYLES = {
  info: {
    container: "border-ir-primary/30 bg-ir-primary/5 text-ir-body",
    icon: "text-ir-primary",
    Icon: InfoIcon,
  },
  warning: {
    container: "border-ir-warning/30 bg-ir-warning/5 text-ir-body",
    icon: "text-ir-warning",
    Icon: WarningIcon,
  },
} as const;

// Small inline notice used inside expanded integration forms — Google's
// "restart required" warning and its "how to get credentials" steps both use
// this instead of one-off hand-rolled boxes.
export function Callout({
  variant = "info",
  className,
  onDismiss,
  children,
}: CalloutProps) {
  const { container, icon, Icon } = VARIANT_STYLES[variant];

  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-ir-sm border p-3 text-xs leading-relaxed",
        container,
        className
      )}
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", icon)} />
      <div className="min-w-0 flex-1 [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-ir-primary [&_ol]:mt-1.5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-4">
        {children}
      </div>
      {onDismiss && (
        <button
          aria-label="Dismiss"
          className={cn(
            "-m-1 shrink-0 rounded-ir-sm p-1 transition-colors duration-150 ease-ir-standard hover:bg-ir-heading/5",
            icon
          )}
          onClick={onDismiss}
          type="button"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
