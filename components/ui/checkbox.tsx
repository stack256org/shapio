"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  checked,
  onCheckedChange,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "checked" | "onChange"> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <input
      data-slot="checkbox"
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      className={cn("checkbox checkbox-sm checkbox-primary", className)}
      {...props}
    />
  )
}

export { Checkbox }
