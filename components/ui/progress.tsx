"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<"progress">) {
  return (
    <progress
      data-slot="progress"
      className={cn("progress progress-primary w-full", className)}
      max={100}
      value={value}
      {...props}
    />
  )
}

export { Progress }
