"use client"

import * as React from "react"
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react"
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size as floatingSize,
  useFloating,
} from "@floating-ui/react"
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

type SelectItemData = {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

// The open list used to be the browser's own native <select> popup (see git
// history) — its item highlight is drawn by the OS/browser and can't be
// restyled with CSS, so it always showed the platform's default blue
// selection color no matter what the rest of the app looked like. This is
// now a real Listbox-backed popup (same floating-ui positioning approach as
// DropdownMenuContent, see the comment there on why not Headless UI's own
// `anchor` prop), so every state below is plain, themeable CSS.
const SelectContext = React.createContext<{
  value?: string
  items: SelectItemData[]
  open: boolean
  referenceElement: HTMLElement | null
  setReferenceElement: (element: HTMLElement | null) => void
} | null>(null)

function useSelectContext(component: string) {
  const ctx = React.useContext(SelectContext)
  if (!ctx) {
    throw new Error(`<${component}> must be used within <Select>`)
  }
  return ctx
}

function collectItems(children: React.ReactNode): SelectItemData[] {
  const items: SelectItemData[] = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      return
    }
    if (child.type === SelectItem) {
      const props = child.props as {
        value: string
        children?: React.ReactNode
        disabled?: boolean
      }
      items.push({
        value: props.value,
        label: props.children,
        disabled: props.disabled,
      })
      return
    }
    const nested = (child.props as { children?: React.ReactNode })?.children
    if (nested) {
      items.push(...collectItems(nested))
    }
  })
  return items
}

function Select({
  value,
  onValueChange,
  disabled,
  children,
}: {
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  const items = React.useMemo(() => collectItems(children), [children])
  const [referenceElement, setReferenceElement] =
    React.useState<HTMLElement | null>(null)

  return (
    <Listbox
      as="div"
      className="contents"
      data-slot="select"
      disabled={disabled}
      onChange={(next: string) => onValueChange?.(next)}
      value={value ?? ""}
    >
      {({ open }) => (
        <SelectContext.Provider
          value={{ value, items, open, referenceElement, setReferenceElement }}
        >
          {children}
        </SelectContext.Provider>
      )}
    </Listbox>
  )
}

// Mirrors DropdownMenuContent's PLACEMENT_MAP (components/ui/dropdown-menu.tsx)
// so every floating-ui-backed overlay in this app resolves side/align the
// same way.
const PLACEMENT_MAP = {
  top: { start: "top-start", end: "top-end", center: "top" },
  bottom: { start: "bottom-start", end: "bottom-end", center: "bottom" },
  left: { start: "left-start", end: "left-end", center: "left" },
  right: { start: "right-start", end: "right-end", center: "right" },
} as const

// Mirrors DropdownMenuContent's ORIGIN_MAP (components/ui/dropdown-menu.tsx)
// — without an explicit transform-origin, the scale-in animation defaults to
// the element's center, which reads as the panel drifting in from an
// unrelated direction (e.g. from the left) instead of growing out of the
// trigger it's anchored to.
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

function SelectContent({
  className,
  children,
  align = "start",
  side = "bottom",
  sideOffset = 4,
}: {
  className?: string
  children: React.ReactNode
  align?: "start" | "end" | "center"
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
}) {
  const { open, referenceElement } = useSelectContext("SelectContent")
  const origin = ORIGIN_MAP[side][align]

  const { refs, floatingStyles, isPositioned } = useFloating({
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
        apply({ availableHeight, elements, rects }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${availableHeight}px`,
            minWidth: `${rects.reference.width}px`,
          })
        },
      }),
    ],
  })

  return (
    <ListboxOptions
      data-slot="select-content"
      modal={false}
      portal
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        // Before floating-ui's first position computation resolves, the
        // panel sits at its unpositioned default (fixed, top:0 left:0 — the
        // viewport's top-left corner). Without this, that corner briefly
        // paints and the panel visibly jumps into place from there, reading
        // as sliding in "from the left" instead of opening at the trigger.
        visibility: isPositioned ? "visible" : "hidden",
      }}
      transition
      className={cn(
        "group/select-content z-50 overflow-x-hidden overflow-y-auto rounded-ir-md border border-ir-border bg-ir-surface p-1.5 text-ir-body shadow-ir-lg outline-hidden",
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
          components/ui/popover.tsx (see its PopoverContent comment) and
          components/ui/dropdown-menu.tsx. */}
      <div
        className={cn(
          "transition duration-100 ease-out group-data-closed/select-content:scale-95 group-data-closed/select-content:opacity-0",
          origin
        )}
      >
        {children}
      </div>
    </ListboxOptions>
  )
}

function SelectGroup({ children }: { children: React.ReactNode }) {
  return <div data-slot="select-group">{children}</div>
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-label"
      className={cn(
        "px-3 py-1.5 text-xs font-semibold text-ir-muted",
        className
      )}
      {...props}
    />
  )
}

function SelectItem({
  value,
  children,
  disabled,
}: {
  value: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <ListboxOption
      data-slot="select-item"
      className="relative flex cursor-pointer items-center gap-2.5 rounded-ir-sm px-3 py-2 text-sm text-ir-body outline-hidden transition-colors duration-100 ease-ir-standard select-none not-data-selected:data-focus:bg-ir-muted-surface data-selected:bg-ir-primary-light/20 data-selected:font-medium data-selected:text-ir-primary data-disabled:pointer-events-none data-disabled:opacity-50 not-last:mb-0.5"
      disabled={disabled}
      value={value}
    >
      {({ selected }) => (
        <>
          <span className="flex-1 truncate">{children}</span>
          {selected && (
            <CheckIcon className="size-3.5 shrink-0 text-ir-primary" />
          )}
        </>
      )}
    </ListboxOption>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-ir-border", className)}
      {...props}
    />
  )
}

function SelectValue({
  placeholder,
  className,
  ...props
}: React.ComponentProps<"span"> & { placeholder?: string }) {
  const ctx = useSelectContext("SelectValue")
  const selected = ctx.items.find((item) => item.value === ctx.value)
  return (
    <span
      data-slot="select-value"
      className={cn(!selected && "text-ir-muted", className)}
      {...props}
    >
      {selected ? selected.label : placeholder}
    </span>
  )
}

function SelectTrigger({
  className,
  children,
  size = "default",
  showChevron = true,
  id,
  style,
  "aria-invalid": ariaInvalid,
}: {
  className?: string
  children?: React.ReactNode
  size?: "sm" | "default" | "lg"
  showChevron?: boolean
  id?: string
  style?: React.CSSProperties
  "aria-invalid"?: React.AriaAttributes["aria-invalid"]
}) {
  const ctx = useSelectContext("SelectTrigger")
  const hasValue = ctx.items.some((item) => item.value === ctx.value)

  return (
    <ListboxButton
      aria-invalid={ariaInvalid}
      data-placeholder={hasValue ? undefined : ""}
      data-size={size}
      data-slot="select-trigger"
      id={id}
      ref={ctx.setReferenceElement}
      style={style}
      className={cn(
        "select relative flex w-fit items-center justify-between gap-1.5 rounded-ir-input border border-ir-border bg-ir-surface bg-none px-3 py-2 text-sm whitespace-nowrap text-ir-body shadow-ir-xs transition-[color,border-color,box-shadow] duration-150 ease-ir-standard outline-none hover:border-ir-primary/40 focus-visible:border-ir-primary focus-visible:ring-2 focus-visible:ring-ir-primary/20 data-open:border-ir-primary data-open:ring-2 data-open:ring-ir-primary/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ir-border aria-invalid:border-ir-danger aria-invalid:focus-visible:ring-ir-danger/20 data-placeholder:text-ir-muted data-[size=default]:h-10 data-[size=lg]:h-12 data-[size=sm]:h-9 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:aria-invalid:border-ir-danger/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
    >
      {children}
      {showChevron && (
        <CaretUpDownIcon className="pointer-events-none size-3.5 shrink-0 text-ir-muted" />
      )}
    </ListboxButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
