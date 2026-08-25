"use client"

import * as React from "react"
import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

const AccordionContext = React.createContext<{
  value: string
  setValue: (value: string) => void
  collapsible: boolean
} | null>(null)

const AccordionItemContext = React.createContext(false)

function Accordion({
  className,
  type: _type,
  collapsible = false,
  value: controlledValue,
  defaultValue,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  type?: "single"
  collapsible?: boolean
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue ?? ""
  )
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : uncontrolledValue

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) {
        setUncontrolledValue(next)
      }
      onValueChange?.(next)
    },
    [isControlled, onValueChange]
  )

  return (
    <AccordionContext.Provider value={{ value, setValue, collapsible }}>
      <div
        data-slot="accordion"
        className={cn("flex w-full flex-col", className)}
        {...props}
      />
    </AccordionContext.Provider>
  )
}

function AccordionItem({
  className,
  value,
  ...props
}: Omit<React.ComponentProps<"details">, "open" | "onToggle" | "value"> & {
  value: string
}) {
  const group = React.useContext(AccordionContext)
  if (!group) {
    throw new Error("AccordionItem must be used within an Accordion")
  }
  const isOpen = group.value === value

  return (
    <AccordionItemContext.Provider value={isOpen}>
      <details
        data-slot="accordion-item"
        data-value={value}
        open={isOpen}
        onToggle={(event) => {
          const opened = event.currentTarget.open
          if (opened) {
            group.setValue(value)
          } else if (group.collapsible) {
            group.setValue("")
          }
        }}
        className={cn(
          "collapse rounded-none not-last:border-b not-last:border-ir-border",
          className
        )}
        {...props}
      />
    </AccordionItemContext.Provider>
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<"summary">) {
  const isOpen = React.useContext(AccordionItemContext)
  return (
    <summary
      data-slot="accordion-trigger"
      aria-expanded={isOpen}
      className={cn(
        "group/accordion-trigger relative flex flex-1 list-none items-start justify-between gap-6 rounded-ir-xs border border-transparent py-4 text-left text-sm font-semibold text-ir-heading transition-colors duration-150 ease-ir-standard outline-none hover:cursor-pointer hover:text-ir-primary hover:underline focus-visible:border-ir-primary focus-visible:ring-2 focus-visible:ring-ir-primary/30 [&::-webkit-details-marker]:hidden **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-3.5 **:data-[slot=accordion-trigger-icon]:text-ir-muted",
        className
      )}
      {...props}
    >
      {children}
      <CaretDownIcon data-slot="accordion-trigger-icon" className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden" />
      <CaretUpIcon data-slot="accordion-trigger-icon" className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline" />
    </summary>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div data-slot="accordion-content" className="overflow-hidden text-sm">
      <div
        className={cn(
          "pt-0 pb-4 text-ir-body [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-ir-primary [&_p:not(:last-child)]:mb-4",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
