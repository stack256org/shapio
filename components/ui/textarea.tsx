import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "textarea flex field-sizing-content min-h-16 w-full resize-none wrap-break-word rounded-ir-input border border-ir-border bg-ir-surface px-3 py-2.5 text-base text-ir-body shadow-ir-xs transition-[color,border-color,box-shadow] duration-150 ease-ir-standard outline-none placeholder:text-ir-muted hover:border-ir-primary/40 focus-visible:border-ir-primary focus-visible:ring-2 focus-visible:ring-ir-primary/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ir-border aria-invalid:border-ir-danger aria-invalid:hover:border-ir-danger aria-invalid:focus-visible:ring-ir-danger/20 md:text-sm dark:aria-invalid:border-ir-danger/50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
