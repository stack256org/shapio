"use client"

import * as React from "react"
import {
  Dialog as HeadlessDialog,
  DialogBackdrop,
  DialogPanel,
} from "@headlessui/react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Headless UI's <Dialog> has no built-in Trigger/uncontrolled-open concept
// (Radix's did) — this context reproduces that so call sites written against
// the old <Dialog><DialogTrigger asChild>...</DialogTrigger><DialogContent>
// pattern keep working unchanged.
type DialogContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext(component: string) {
  const ctx = React.useContext(DialogContext)
  if (!ctx) {
    throw new Error(`<${component}> must be used within <Dialog>`)
  }
  return ctx
}

function Dialog({
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
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  )
}

function DialogTrigger({
  asChild,
  onClick,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { setOpen } = useDialogContext("DialogTrigger")

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      onClick?: (event: React.MouseEvent) => void
    }>
    return React.cloneElement(child, {
      onClick: (event: React.MouseEvent) => {
        child.props.onClick?.(event)
        if (!event.defaultPrevented) setOpen(true)
      },
    })
  }

  return (
    <button
      data-slot="dialog-trigger"
      type="button"
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(true)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

function DialogClose({
  asChild,
  onClick,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { setOpen } = useDialogContext("DialogClose")

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      onClick?: (event: React.MouseEvent) => void
    }>
    return React.cloneElement(child, {
      onClick: (event: React.MouseEvent) => {
        child.props.onClick?.(event)
        if (!event.defaultPrevented) setOpen(false)
      },
    })
  }

  return (
    <button
      data-slot="dialog-close"
      type="button"
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(false)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

type DismissEvent = { preventDefault: () => void }

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onEscapeKeyDown,
  onInteractOutside,
  ...props
}: Omit<React.ComponentProps<"div">, "onClose"> & {
  showCloseButton?: boolean
  // Headless UI's onClose fires uniformly for Escape and outside-click,
  // with no way to tell which triggered it — both handlers are invoked
  // together on any dismiss attempt. Every current call site uses these
  // only to unconditionally preventDefault (a fully non-dismissable
  // dialog), which this reproduces exactly.
  onEscapeKeyDown?: (event: DismissEvent) => void
  onInteractOutside?: (event: DismissEvent) => void
}) {
  const { open, setOpen } = useDialogContext("DialogContent")

  const handleClose = () => {
    if (onEscapeKeyDown || onInteractOutside) {
      let prevented = false
      const event: DismissEvent = {
        preventDefault: () => {
          prevented = true
        },
      }
      onEscapeKeyDown?.(event)
      onInteractOutside?.(event)
      if (prevented) return
    }
    setOpen(false)
  }

  return (
    <HeadlessDialog
      data-slot="dialog"
      open={open}
      onClose={handleClose}
      transition
      className="relative z-50"
    >
      <DialogBackdrop
        data-slot="dialog-overlay"
        transition
        className="fixed inset-0 isolate bg-black/40 duration-100 data-closed:opacity-0"
      />
      <div className="fixed inset-0 z-50 flex w-screen items-center justify-center p-4">
        <DialogPanel
          data-slot="dialog-content"
          transition
          className={cn(
            "relative grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] gap-6 overflow-y-auto rounded-ir-card border border-ir-border bg-ir-surface p-6 text-sm text-ir-body shadow-ir-xl duration-100 data-closed:scale-95 data-closed:opacity-0 sm:max-w-md",
            className
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <Button
              aria-label="Close dialog"
              className="absolute top-4 right-4"
              onClick={() => setOpen(false)}
              size="icon-sm"
              variant="outline"
            >
              <X strokeWidth={2} />
            </Button>
          )}
        </DialogPanel>
      </div>
    </HeadlessDialog>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && <DialogClose asChild>
        <Button variant="outline">Close</Button>
      </DialogClose>}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn(
        "font-heading text-lg leading-none font-semibold tracking-wider text-ir-heading uppercase",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-description"
      className={cn(
        "mt-0.5 text-sm leading-relaxed text-ir-muted *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-ir-primary",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
