"use client"

import * as React from "react"

// DaisyUI's `tooltip` is CSS-only (shows on hover / :focus-visible via
// `data-tip`'s attr() content, no JS) — both real consumers just show a
// plain string on a static pill, so there's no positioning/portal/delay
// behavior worth pulling in a library for. TooltipProvider/TooltipTrigger
// exist only to keep the old call-site shape (<Tooltip><TooltipTrigger
// asChild>...</TooltipTrigger><TooltipContent>...</TooltipContent></Tooltip>)
// working unchanged.
function nodeToText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }
  return React.Children.toArray(node)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : ""
    )
    .join("")
}

function TooltipProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function TooltipTrigger({
  children,
}: {
  asChild?: boolean
  children?: React.ReactNode
}) {
  return <>{children}</>
}

function TooltipContent({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function Tooltip({ children }: { children?: React.ReactNode }) {
  let trigger: React.ReactNode
  let tip: string | undefined

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      return
    }
    const props = child.props as { children?: React.ReactNode }
    if (child.type === TooltipTrigger) {
      trigger = props.children
    } else if (child.type === TooltipContent) {
      tip = nodeToText(props.children)
    }
  })

  return (
    <span className="tooltip" data-tip={tip}>
      {trigger}
    </span>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
