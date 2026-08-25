import { cn } from "@/lib/utils"

// Split out of button.tsx (which is "use client" for the Button component's
// use of framer-motion/useReducedMotion) — this config itself has no
// client-only dependency, and Server Components need to call it directly
// (e.g. to style a plain <Link> as a button), which isn't possible for a
// named export of a "use client" module.
// DaisyUI `btn` supplies the interaction/base layer (focus ring, disabled
// state, active/hover depth via the theme in globals.css); the utility
// classes layered on top preserve this app's specific admin-panel type
// treatment (uppercase, tracking-ui) and exact sizing, which DaisyUI's
// defaults don't match. Tailwind's utilities layer always beats DaisyUI's
// components layer, so these overrides are safe.
const BUTTON_BASE =
  "btn group/button rounded-field border-transparent bg-clip-padding text-xs font-semibold tracking-ui whitespace-nowrap uppercase shadow-none transition-all duration-150 ease-ir-standard outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5"

export type ButtonVariant =
  | "default"
  | "outline"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link"

export type ButtonSize =
  | "default"
  | "xs"
  | "sm"
  | "lg"
  | "icon"
  | "icon-xs"
  | "icon-sm"
  | "icon-lg"

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default: "btn-primary shadow-ir-xs hover:shadow-ir-sm",
  outline:
    "btn-outline border-base-300 bg-base-100 text-base-content hover:bg-base-200 aria-expanded:bg-base-200",
  secondary:
    "border-transparent bg-base-200 text-base-content hover:bg-base-300 aria-expanded:bg-base-300",
  ghost: "btn-ghost hover:bg-base-200 aria-expanded:bg-base-200",
  destructive:
    "btn-ghost bg-error/10 text-error hover:bg-error/20 focus-visible:border-error/40 focus-visible:ring-error/20",
  link: "btn-link px-0 text-primary no-underline hover:underline",
}

const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  default:
    "h-10 min-h-10 gap-1.5 px-6 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
  xs: "h-7 min-h-7 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
  sm: "h-9 min-h-9 gap-1 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
  lg: "h-11 min-h-11 gap-1.5 px-8 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
  icon: "btn-square size-10",
  "icon-xs": "btn-square size-7 [&_svg:not([class*='size-'])]:size-3",
  "icon-sm": "btn-square size-9",
  "icon-lg": "btn-square size-11",
}

export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}) {
  return cn(
    BUTTON_BASE,
    BUTTON_VARIANT_CLASSES[variant],
    BUTTON_SIZE_CLASSES[size],
    className
  )
}
