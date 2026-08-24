"use client"

import * as React from "react"
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
  type FloatingContext,
  type UseFloatingReturn,
} from "@floating-ui/react"

import { cn } from "@/lib/utils"
import { mergeProps } from "@/lib/merge-props"

// Every real consumer needs Popover fully controlled (open/onOpenChange as a
// genuine two-way pair — e.g. LinkedPostsSelector opens it from an input's
// onFocus, not from a click on a designated trigger), which neither
// Headless UI's Popover nor Menu support (both are internally state-managed,
// exposing state one-directionally at best — see the same finding recorded
// in dropdown-menu.tsx). @floating-ui/react's interaction hooks are already
// a project dependency (used there for positioning) and cover controlled
// open state, outside-click/Escape dismissal, portal rendering, and focus
// management directly, so this is built on those instead of Headless UI.
interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  refs: UseFloatingReturn["refs"]
  floatingStyles: React.CSSProperties
  floatingContext: FloatingContext
  isPositioned: boolean
  getReferenceProps: (
    userProps?: React.HTMLProps<Element>
  ) => Record<string, unknown>
  getFloatingProps: (
    userProps?: React.HTMLProps<HTMLElement>
  ) => Record<string, unknown>
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null)

function usePopoverContext(component: string) {
  const ctx = React.useContext(PopoverContext)
  if (!ctx) {
    throw new Error(`<${component}> must be used within <Popover>`)
  }
  return ctx
}

// Mirrors DropdownMenuContent's PLACEMENT_MAP (components/ui/dropdown-menu.tsx)
// so both floating-ui-backed overlays in this app resolve side/align the same
// way. "start"/"end" are logical (start = left edge in LTR), matching how
// every current consumer already reasons about alignment.
const PLACEMENT_MAP = {
  top: { start: "top-start", end: "top-end", center: "top" },
  bottom: { start: "bottom-start", end: "bottom-end", center: "bottom" },
  left: { start: "left-start", end: "left-end", center: "left" },
  right: { start: "right-start", end: "right-end", center: "right" },
} as const

function Popover({
  open: openProp,
  onOpenChange,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "end" | "center"
  sideOffset?: number
  children?: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = openProp ?? internalOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      setInternalOpen(next)
      onOpenChange?.(next)
    },
    [onOpenChange]
  )

  const { refs, floatingStyles, context, isPositioned } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: PLACEMENT_MAP[side][align],
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(sideOffset),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
    ],
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)
  const role = useRole(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ])

  return (
    <PopoverContext.Provider
      value={{
        open,
        setOpen,
        refs,
        floatingStyles,
        floatingContext: context,
        isPositioned,
        getReferenceProps,
        getFloatingProps,
      }}
    >
      {children}
    </PopoverContext.Provider>
  )
}

// No ref composition — none of this app's Popover triggers pass their own
// ref today (verified across all call sites); revisit if one ever does.
function PopoverTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { refs, getReferenceProps } = usePopoverContext("PopoverTrigger")
  const referenceProps = getReferenceProps(props as React.HTMLProps<Element>)

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>
    return React.cloneElement(
      child,
      mergeProps(
        { ...referenceProps, ref: refs.setReference },
        child.props
      )
    )
  }

  return (
    <button
      data-slot="popover-trigger"
      ref={refs.setReference}
      type="button"
      {...referenceProps}
    >
      {children}
    </button>
  )
}

// A passive positioning reference with no click-to-open behavior of its own
// — the consumer drives `open` itself (e.g. on an input's onFocus/onChange).
function PopoverAnchor({
  asChild,
  children,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const { refs } = usePopoverContext("PopoverAnchor")

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>
    return React.cloneElement(child, { ref: refs.setReference })
  }

  return (
    <div data-slot="popover-anchor" ref={refs.setReference} {...props}>
      {children}
    </div>
  )
}

type DismissEvent = { preventDefault: () => void }

function PopoverContent({
  className,
  children,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: Omit<React.ComponentProps<"div">, "onClose"> & {
  onOpenAutoFocus?: (event: DismissEvent) => void
  onCloseAutoFocus?: (event: DismissEvent) => void
}) {
  const { refs, floatingStyles, floatingContext, isPositioned, getFloatingProps } =
    usePopoverContext("PopoverContent")

  const { isMounted, styles: transitionStyles } = useTransitionStyles(
    floatingContext,
    {
      duration: 100,
      initial: { opacity: 0, transform: "scale(0.95)" },
    }
  )

  if (!isMounted) {
    return null
  }

  return (
    <FloatingPortal>
      <FloatingFocusManager
        context={floatingContext}
        initialFocus={onOpenAutoFocus ? -1 : 0}
        modal={false}
        returnFocus={!onCloseAutoFocus}
      >
        {/* Positioning (floatingStyles) and the enter/exit animation
            (transitionStyles) both express themselves via a CSS `transform`
            — floatingStyles uses translate(x, y) to place the panel at the
            trigger, transitionStyles uses scale() for the open/close
            animation. Spreading both onto one element lets whichever is
            spread last silently overwrite the other's transform (e.g.
            transitionStyles' settled-state `transform: ''` wiping out the
            trigger-relative translate, pinning the panel at the fixed
            element's default top:0/left:0 — the viewport's top-left corner,
            wherever that happens to sit in the layout). Splitting them across
            two nested elements — outer for position, inner for animation —
            keeps each transform independent. */}
        <div
          data-slot="popover-content"
          ref={refs.setFloating}
          style={{
            ...floatingStyles,
            zIndex: 50,
            // Floating UI reports (x: 0, y: 0) until its first async
            // computePosition() resolves. That resolves in a microtask
            // flushed before paint in the common case, but under load
            // (devtools open, slow devices) it can slip a frame — which
            // reads as the panel flashing at the viewport's top-left
            // corner before jumping to the trigger. Suppress with
            // opacity/pointer-events (not visibility/unmount) so
            // FloatingFocusManager's initial-focus handling is unaffected.
            ...(isPositioned
              ? null
              : { opacity: 0, pointerEvents: "none" as const }),
          }}
          {...getFloatingProps(props as React.HTMLProps<HTMLElement>)}
        >
          <div
            className={cn(
              "flex w-72 flex-col gap-4 rounded-ir-md border border-ir-border bg-ir-surface p-4 text-sm text-ir-body shadow-ir-lg outline-hidden",
              className
            )}
            style={transitionStyles}
          >
            {children}
          </div>
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  )
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger }
