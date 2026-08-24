"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<{
  name: string
  value?: string
  onValueChange?: (value: string) => void
} | null>(null)

function RadioGroup({
  className,
  value,
  onValueChange,
  name,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  value?: string
  onValueChange?: (value: string) => void
  name?: string
}) {
  const generatedName = React.useId()
  return (
    <RadioGroupContext.Provider
      value={{ name: name ?? generatedName, value, onValueChange }}
    >
      <div
        data-slot="radio-group"
        role="radiogroup"
        className={cn("grid w-full gap-3", className)}
        {...props}
      />
    </RadioGroupContext.Provider>
  )
}

function RadioGroupItem({
  className,
  value,
  ...props
}: Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "checked" | "onChange" | "name"
> & {
  value: string
}) {
  const group = React.useContext(RadioGroupContext)
  return (
    <input
      data-slot="radio-group-item"
      type="radio"
      name={group?.name}
      value={value}
      checked={group?.value === value}
      onChange={() => group?.onValueChange?.(value)}
      className={cn("radio radio-sm radio-primary", className)}
      {...props}
    />
  )
}

export { RadioGroup, RadioGroupItem }
