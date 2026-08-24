import * as React from "react"

import { cn } from "@/lib/utils"

const BADGE_BASE =
  "badge group/badge w-fit shrink-0 gap-1.5 overflow-hidden border-transparent px-2 py-0.5 text-xs font-semibold tracking-ui whitespace-nowrap uppercase transition-colors duration-150 ease-ir-standard focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/30 has-data-[icon=inline-end]:pr-0 has-data-[icon=inline-start]:pl-0 aria-invalid:border-error aria-invalid:ring-error/20 [&>svg]:pointer-events-none [&>svg]:size-3!"

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link"

const BADGE_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-primary/15 text-primary [a]:hover:bg-primary/25",
  secondary:
    "badge-neutral bg-base-200 text-base-content [a]:hover:bg-base-300",
  destructive:
    "bg-error/10 text-error focus-visible:ring-error/20 [a]:hover:bg-error/20",
  outline:
    "badge-outline border-base-300 bg-transparent text-base-content [a]:hover:bg-base-200",
  ghost:
    "badge-ghost border-transparent bg-transparent px-0 text-base-content/60 hover:text-base-content",
  link: "border-transparent bg-transparent px-0 text-base-content underline-offset-4 hover:underline",
}

function badgeVariants({
  variant = "default",
}: { variant?: BadgeVariant } = {}) {
  return cn(BADGE_BASE, BADGE_VARIANT_CLASSES[variant])
}

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
