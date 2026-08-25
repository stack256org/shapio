"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group relative flex h-10 w-full min-w-0 items-center rounded-ir-input border border-ir-border bg-ir-surface shadow-ir-xs transition-[color,border-color,box-shadow] duration-150 ease-ir-standard outline-none in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-data-[align=block-end]:rounded-ir-input has-data-[align=block-start]:rounded-ir-input has-[[data-slot=input-group-control]:focus-visible]:border-ir-primary has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ir-primary/20 has-[[data-slot][aria-invalid=true]]:border-ir-danger has-[textarea]:rounded-ir-input has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto dark:has-[[data-slot][aria-invalid=true]]:border-ir-danger/50 has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3",
        className
      )}
      {...props}
    />
  )
}

const INPUT_GROUP_ADDON_BASE =
  "flex h-auto cursor-text items-center justify-center gap-2 py-2 text-sm font-medium text-ir-muted select-none group-data-[disabled=true]/input-group:opacity-50 **:data-[slot=kbd]:rounded-ir-xs **:data-[slot=kbd]:bg-ir-muted-surface **:data-[slot=kbd]:px-1.5 [&>svg:not([class*='size-'])]:size-3.5"

export type InputGroupAddonAlign =
  | "inline-start"
  | "inline-end"
  | "block-start"
  | "block-end"

const INPUT_GROUP_ADDON_ALIGN_CLASSES: Record<InputGroupAddonAlign, string> = {
  "inline-start": "order-first",
  "inline-end": "order-last",
  "block-start":
    "order-first w-full justify-start pt-3 group-has-[>input]/input-group:pt-3.5 [.border-b]:pb-3.5",
  "block-end":
    "order-last w-full justify-start pb-3 group-has-[>input]/input-group:pb-3.5 [.border-t]:pt-3.5",
}

function inputGroupAddonVariants({
  align = "inline-start",
}: { align?: InputGroupAddonAlign } = {}) {
  return cn(INPUT_GROUP_ADDON_BASE, INPUT_GROUP_ADDON_ALIGN_CLASSES[align])
}

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & { align?: InputGroupAddonAlign }) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus()
      }}
      {...props}
    />
  )
}

const INPUT_GROUP_BUTTON_BASE =
  "flex items-center gap-2 rounded-ir-sm text-sm shadow-none"

export type InputGroupButtonSize = "xs" | "sm" | "icon-xs" | "icon-sm"

const INPUT_GROUP_BUTTON_SIZE_CLASSES: Record<InputGroupButtonSize, string> = {
  xs: "h-6 gap-1 rounded-ir-sm px-1.5 text-xs [&>svg:not([class*='size-'])]:size-3.5",
  sm: "",
  "icon-xs": "size-6 p-0 text-xs has-[>svg]:p-0",
  "icon-sm": "size-8 p-0 has-[>svg]:p-0",
}

function inputGroupButtonVariants({
  size = "xs",
}: { size?: InputGroupButtonSize } = {}) {
  return cn(INPUT_GROUP_BUTTON_BASE, INPUT_GROUP_BUTTON_SIZE_CLASSES[size])
}

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> & {
  size?: InputGroupButtonSize
}) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-ir-muted [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "flex-1 border-0 bg-transparent ring-0 group-has-[>[data-align=inline-end]]/input-group:pr-2 group-has-[>[data-align=inline-start]]/input-group:pl-2 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none border-0 bg-transparent py-2.5 ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}
