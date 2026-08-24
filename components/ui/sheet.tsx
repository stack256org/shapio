"use client"

import * as React from "react"
import {
  Dialog as HeadlessDialog,
  DialogBackdrop,
  DialogPanel,
} from "@headlessui/react"
import { XIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Same Headless UI Dialog foundation as components/ui/dialog.tsx — a Sheet
// is a Dialog anchored to a screen edge, so it reuses the identical
// open-state context + asChild trigger/close shim, just with a different
// panel position/transition.
type SheetContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue | null>(null)

function useSheetContext(component: string) {
  const ctx = React.useContext(SheetContext)
  if (!ctx) {
    throw new Error(`<${component}> must be used within <Sheet>`)
  }
  return ctx
}

function Sheet({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const open = openProp ?? internalOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      setInternalOpen(next)
      onOpenChange?.(next)
    },
    [onOpenChange]
  )

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  )
}

function SheetTrigger({
  asChild,
  onClick,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { setOpen } = useSheetContext("SheetTrigger")

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      onClick?: (event: React.MouseEvent) => void
    }>
    return React.cloneElement(child, {
      onClick: (event: React.MouseEvent) => {
        child.props.onClick?.(event)
        if (!event.defaultPrevented) {
          setOpen(true)
        }
      },
    })
  }

  return (
    <button
      data-slot="sheet-trigger"
      type="button"
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          setOpen(true)
        }
      }}
      {...props}
    >
      {children}
    </button>
  )
}

function SheetClose({
  asChild,
  onClick,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { setOpen } = useSheetContext("SheetClose")

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      onClick?: (event: React.MouseEvent) => void
    }>
    return React.cloneElement(child, {
      onClick: (event: React.MouseEvent) => {
        child.props.onClick?.(event)
        if (!event.defaultPrevented) {
          setOpen(false)
        }
      },
    })
  }

  return (
    <button
      data-slot="sheet-close"
      type="button"
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          setOpen(false)
        }
      }}
      {...props}
    >
      {children}
    </button>
  )
}

const SIDE_CLASSES = {
  top: "inset-x-0 top-0 h-auto border-b data-closed:-translate-y-full",
  bottom: "inset-x-0 bottom-0 h-auto border-t data-closed:translate-y-full",
  left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm data-closed:-translate-x-full",
  right:
    "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm data-closed:translate-x-full",
} as const

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: Omit<React.ComponentProps<"div">, "onClose"> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const { open, setOpen } = useSheetContext("SheetContent")

  return (
    <HeadlessDialog
      data-slot="sheet"
      open={open}
      onClose={() => setOpen(false)}
      transition
      className="relative z-50"
    >
      <DialogBackdrop
        data-slot="sheet-overlay"
        transition
        className="fixed inset-0 isolate bg-black/40 duration-100 data-closed:opacity-0"
      />
      <DialogPanel
        data-slot="sheet-content"
        data-side={side}
        transition
        className={cn(
          "fixed z-50 flex flex-col border-ir-border bg-ir-surface bg-clip-padding text-sm text-ir-body shadow-ir-lg transition duration-200 ease-in-out",
          SIDE_CLASSES[side],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetClose asChild>
            <Button
              variant="ghost"
              className="absolute top-4 right-4 bg-ir-muted-surface"
              size="icon-sm"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </SheetClose>
        )}
      </DialogPanel>
    </HeadlessDialog>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-8", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-8", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="sheet-title"
      className={cn(
        "font-heading text-lg font-semibold tracking-wider text-ir-heading uppercase",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="sheet-description"
      className={cn("mt-0.5 text-sm leading-relaxed text-ir-muted", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
