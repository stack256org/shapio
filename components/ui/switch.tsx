"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const SWITCH_SIZE_CLASSES: Record<"sm" | "default", string> = {
  default: "toggle-sm",
  sm: "toggle-xs",
};

function Switch({
  className,
  size = "default",
  checked,
  onCheckedChange,
  ...props
}: Omit<
  React.ComponentProps<"input">,
  "type" | "size" | "checked" | "onChange"
> & {
  size?: "sm" | "default";
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <input
      data-slot="switch"
      type="checkbox"
      role="switch"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      className={cn(
        "toggle toggle-primary",
        SWITCH_SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}

export { Switch };
