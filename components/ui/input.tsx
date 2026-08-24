import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "input h-10 w-full min-w-0 rounded-ir-input border border-ir-border bg-ir-surface px-3 py-1 text-base text-ir-body shadow-ir-xs transition-[color,border-color,box-shadow] duration-150 ease-ir-standard outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ir-heading placeholder:text-ir-muted hover:border-ir-primary/40 focus-visible:border-ir-primary focus-visible:ring-2 focus-visible:ring-ir-primary/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ir-border aria-invalid:border-ir-danger aria-invalid:hover:border-ir-danger aria-invalid:focus-visible:ring-ir-danger/20 md:text-sm dark:aria-invalid:border-ir-danger/50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
