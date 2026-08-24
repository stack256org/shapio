"use client"

import * as React from "react"
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  MenuSection,
} from "@headlessui/react"
import {
  autoUpdate,
  flip,
  hide,
  offset,
  shift,
  size as floatingSize,
  useFloating,
} from "@floating-ui/react"
import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

// Headless UI's own `anchor` prop (used pre-refactor) drives its floating
// position with `strategy: "absolute"` and a `shift()` → `flip()` middleware
// order (see @headlessui/react/dist/internal/floating.js) — shift runs
// BEFORE flip, so flip's overflow check sees an already-shifted, seemingly
// in-bounds rect and skips flipping to the opposite side. Verified live: a
// menu opened near the bottom of a scrolling container and left open while
// the container scrolls ends up rendering past the viewport edge instead of
// flipping above. We bypass `anchor` entirely and drive positioning
// ourselves with `@floating-ui/react` (offset → flip → shift → size,
// strategy: "fixed", autoUpdate), while still using Headless UI's Menu/
// MenuButton/MenuItems for open state, a11y and its own Portal so keyboard
// nav, outside-click and focus-return keep working unchanged.
interface DropdownMenuFloatingContextValue {
  open: boolean
  close: () => void
  referenceElement: HTMLElement | null
  setReferenceElement: (element: HTMLElement | null) => void
}

const DropdownMenuFloatingContext =
  React.createContext<DropdownMenuFloatingContextValue | null>(null)

function useDropdownMenuFloatingContext() {
  const context = React.useContext(DropdownMenuFloatingContext)
  if (!context) {
    throw new Error(
      "DropdownMenu subcomponents must be rendered within <DropdownMenu>"
    )
  }
  return context
}

// Headless UI's Menu manages open state internally and doesn't accept a
// controlled `open` prop — the incoming `open` is accepted for API
// compatibility but only used one-directionally: `onOpenChange` mirrors
// Menu's real internal state out to the caller (e.g. to rotate a chevron),
// matching every current call site's usage. None force the menu open from
// outside.
function DropdownMenu({
  onOpenChange,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}) {
  const [referenceElement, setReferenceElement] =
    React.useState<HTMLElement | null>(null)

  return (
    <Menu data-slot="dropdown-menu">
      {({ open, close }) => (
        <DropdownMenuFloatingContext.Provider
          value={{ open, close, referenceElement, setReferenceElement }}
        >
          <MenuOpenReporter onOpenChange={onOpenChange} open={open}>
            {children}
          </MenuOpenReporter>
        </DropdownMenuFloatingContext.Provider>
      )}
    </Menu>
  )
}

function MenuOpenReporter({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}) {
  React.useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])
  return <>{children}</>
}

// `as={Fragment}` is Headless UI's asChild equivalent — it forwards a11y
// props (aria-expanded, onClick, ref) straight onto the single child instead
// of wrapping it in its own <button>. The extra `ref` callback below is
// merged in alongside Headless UI's own internal refs (it merges any number
// of forwarded refs via useSyncRefs) — it's how DropdownMenuContent's
// floating-ui instance learns the trigger's real DOM node.
function DropdownMenuTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { setReferenceElement } = useDropdownMenuFloatingContext()
  const referenceRef = React.useCallback(
    (node: Element | null) => {
      setReferenceElement(node instanceof HTMLElement ? node : null)
    },
    [setReferenceElement]
  )

  if (asChild) {
    return (
      <MenuButton as={React.Fragment} ref={referenceRef} {...props}>
        {children}
      </MenuButton>
    )
  }
  return (
    <MenuButton
      data-slot="dropdown-menu-trigger"
      ref={referenceRef}
      {...props}
    >
      {children}
    </MenuButton>
  )
}

const PLACEMENT_MAP = {
  top: { start: "top-start", end: "top-end", center: "top" },
  bottom: { start: "bottom-start", end: "bottom-end", center: "bottom" },
  left: { start: "left-start", end: "left-end", center: "left" },
  right: { start: "right-start", end: "right-end", center: "right" },
} as const

// Scale-in should originate from the corner nearest the trigger, not the
// element's center — otherwise the open animation reads as drifting in from
// an unrelated direction instead of growing out of the clicked button.
const ORIGIN_MAP = {
  top: {
    start: "origin-bottom-left",
    end: "origin-bottom-right",
    center: "origin-bottom",
  },
  bottom: {
    start: "origin-top-left",
    end: "origin-top-right",
    center: "origin-top",
  },
  left: {
    start: "origin-top-right",
    end: "origin-bottom-right",
    center: "origin-right",
  },
  right: {
    start: "origin-top-left",
    end: "origin-bottom-left",
    center: "origin-left",
  },
} as const

function DropdownMenuContent({
  className,
  align = "start",
  side = "bottom",
  sideOffset = 4,
  children,
}: {
  className?: string
  align?: "start" | "end" | "center"
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
  children?: React.ReactNode
}) {
  const { open, close, referenceElement } = useDropdownMenuFloatingContext()
  const origin = ORIGIN_MAP[side][align]

  // strategy: "fixed" (not "absolute") so the panel positions itself
  // relative to the viewport, immune to any scrolling/overflow/transform
  // ancestor between the trigger and the portal root. offset → flip → shift
  // → size, in that order, is the order Floating UI's own docs recommend —
  // flip must see the true overflow before shift narrows it away (the bug
  // this replaces had shift before flip, which suppressed flipping; see the
  // comment above DropdownMenuFloatingContext).
  const { refs, floatingStyles, middlewareData, isPositioned } = useFloating({
    open,
    placement: PLACEMENT_MAP[side][align],
    strategy: "fixed",
    elements: { reference: referenceElement },
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(sideOffset),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      floatingSize({
        padding: 8,
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${availableHeight}px`,
          })
        },
      }),
      // If the trigger itself scrolls out of its clipping ancestor (the
      // table's own overflow-auto region) while the menu is open, there's
      // no valid on-screen position left to anchor to — shift can only
      // slide the panel so far before it either floats away from the
      // trigger or spills past the viewport. Matches how GitHub/Linear/
      // Vercel behave: the menu closes instead of drifting or clipping.
      hide({ padding: 8 }),
    ],
  })

  React.useEffect(() => {
    const referenceGone =
      middlewareData.hide?.referenceHidden || middlewareData.hide?.escaped
    if (open && referenceGone) {
      close()
    }
  }, [open, middlewareData.hide, close])

  return (
    <MenuItems
      data-slot="dropdown-menu-content"
      modal={false}
      portal
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        // Before floating-ui's first position computation resolves, the
        // panel sits at its unpositioned default (fixed, top:0 left:0 — the
        // viewport's top-left corner). Without this, that corner briefly
        // paints and the panel visibly jumps into place from there, reading
        // as sliding in from the wrong direction instead of opening at the
        // trigger. Mirrors the same fix in components/ui/select.tsx.
        visibility: isPositioned ? "visible" : "hidden",
      }}
      transition
      className={cn(
        "group/dropdown-menu-content z-50 min-w-48 overflow-x-hidden overflow-y-auto rounded-ir-md border border-base-300 bg-base-100 p-1.5 text-base-content shadow-ir-lg",
        className
      )}
    >
      {/* Positioning (floatingStyles, above) and the enter/exit scale
          animation (data-closed:scale-95) both express themselves via a CSS
          `transform` on this element. If they shared one element, floating-ui's
          inline `translate(x, y)` update from its unpositioned (0, 0) default
          to the real trigger-relative position would itself get picked up by
          the `transition` utility's `transform` entry and animate — the panel
          visibly sliding in from the viewport's top-left corner over the
          transition duration instead of appearing already in place. Splitting
          position (this element) from the scale/opacity animation (nested div,
          driven by this element's own `data-closed` state via `group`) keeps
          the two transforms independent. Mirrors the same split in
          components/ui/popover.tsx (see its PopoverContent comment). */}
      <div
        className={cn(
          "transition duration-100 ease-out group-data-closed/dropdown-menu-content:scale-95 group-data-closed/dropdown-menu-content:opacity-0",
          origin
        )}
      >
        {children}
      </div>
    </MenuItems>
  )
}

function DropdownMenuGroup({ children }: { children?: React.ReactNode }) {
  return <MenuSection data-slot="dropdown-menu-group">{children}</MenuSection>
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  disabled,
  asChild,
  onClick,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  inset?: boolean
  variant?: "default" | "destructive"
  disabled?: boolean
  asChild?: boolean
}) {
  const itemClassName = cn(
    "group/dropdown-menu-item relative flex cursor-pointer items-center gap-2.5 rounded-ir-sm px-3 py-2 text-xs font-medium tracking-wider uppercase outline-hidden transition-colors duration-100 select-none not-data-[variant=destructive]:data-focus:bg-base-200 data-inset:pl-9.5 data-[variant=destructive]:text-error data-[variant=destructive]:data-focus:bg-error/10 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 data-[variant=destructive]:*:[svg]:text-error not-last:mb-1",
    className
  )

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>
    return (
      <MenuItem disabled={disabled}>
        {React.cloneElement(child, {
          className: cn(itemClassName, child.props.className),
          "data-inset": inset,
          "data-slot": "dropdown-menu-item",
          "data-variant": variant,
        } as Record<string, unknown>)}
      </MenuItem>
    )
  }

  return (
    <MenuItem disabled={disabled}>
      <div
        data-inset={inset}
        data-slot="dropdown-menu-item"
        data-variant={variant}
        className={itemClassName}
        onClick={onClick}
        {...props}
      >
        {children}
      </div>
    </MenuItem>
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  onCheckedChange,
  ...props
}: React.ComponentProps<"div"> & {
  inset?: boolean
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <MenuItem>
      <div
        data-inset={inset}
        data-slot="dropdown-menu-checkbox-item"
        data-state={checked ? "checked" : "unchecked"}
        className={cn(
          "relative flex cursor-pointer items-center gap-2.5 rounded-ir-sm py-2 pr-8 pl-3 text-xs font-medium tracking-wider uppercase outline-hidden transition-colors duration-100 select-none not-data-[state=checked]:data-focus:bg-base-200 data-[state=checked]:bg-primary/15 data-[state=checked]:text-primary data-inset:pl-9.5 not-last:mb-1",
          className
        )}
        onClick={() => onCheckedChange?.(!checked)}
        {...props}
      >
        {checked && (
          <span
            className="pointer-events-none absolute right-2 flex items-center justify-center"
            data-slot="dropdown-menu-checkbox-item-indicator"
          >
            <CheckIcon />
          </span>
        )}
        {children}
      </div>
    </MenuItem>
  )
}

function DropdownMenuRadioGroup({
  value,
  onValueChange,
  children,
}: {
  value?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
}) {
  return (
    <div data-slot="dropdown-menu-radio-group">
      {React.Children.map(children, (child) => {
        if (!React.isValidElement<{ checked?: boolean; onSelect?: () => void; value?: string }>(child)) {
          return child
        }
        return React.cloneElement(child, {
          checked: child.props.value === value,
          onSelect: () => child.props.value && onValueChange?.(child.props.value),
        })
      })}
    </div>
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  checked,
  onSelect,
  ...props
}: React.ComponentProps<"div"> & {
  inset?: boolean
  checked?: boolean
  onSelect?: () => void
  value?: string
}) {
  return (
    <MenuItem>
      <div
        data-inset={inset}
        data-slot="dropdown-menu-radio-item"
        data-state={checked ? "checked" : "unchecked"}
        className={cn(
          "relative flex cursor-pointer items-center gap-2.5 rounded-ir-sm py-2 pr-8 pl-3 text-xs font-medium tracking-wider uppercase outline-hidden transition-colors duration-100 select-none not-data-[state=checked]:data-focus:bg-base-200 data-[state=checked]:bg-primary/15 data-[state=checked]:text-primary data-inset:pl-9.5 not-last:mb-1",
          className
        )}
        onClick={onSelect}
        {...props}
      >
        {checked && (
          <span
            className="pointer-events-none absolute right-2 flex items-center justify-center"
            data-slot="dropdown-menu-radio-item-indicator"
          >
            <CheckIcon />
          </span>
        )}
        {children}
      </div>
    </MenuItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<"div"> & { inset?: boolean }) {
  return (
    <div
      data-inset={inset}
      data-slot="dropdown-menu-label"
      className={cn(
        "px-3 py-2 text-xs font-semibold tracking-wider text-base-content/60 uppercase data-inset:pl-9.5",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1.5 my-1.5 h-px bg-base-300", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-base-content/60 group-data-focus/dropdown-menu-item:text-primary",
        className
      )}
      {...props}
    />
  )
}

// Headless UI's Menu has no native nested-submenu primitive (unused in this
// app today) — approximated with a second independent Menu anchored to the
// trigger item, opened on hover/focus of the parent item.
function DropdownMenuSub({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<"div"> & { inset?: boolean }) {
  return (
    <div
      data-inset={inset}
      data-slot="dropdown-menu-sub-trigger"
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-ir-sm px-3 py-2 text-xs font-medium tracking-wider uppercase outline-hidden transition-colors duration-100 select-none hover:bg-primary/15 hover:text-primary data-inset:pl-9.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 not-last:mb-1",
        className
      )}
      {...props}
    >
      {children}
      <CaretRightIcon className="ml-auto" />
    </div>
  )
}

function DropdownMenuSubContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "z-50 min-w-36 overflow-hidden rounded-ir-md border border-base-300 bg-base-100 p-1.5 text-base-content shadow-ir-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
