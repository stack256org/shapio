"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon, SpinnerIcon } from "@phosphor-icons/react"
import { SuccessCheck } from "@/components/ui/success-check"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <SuccessCheck className="size-4 text-ir-success" />,
        info: (
          <InfoIcon className="size-4 text-info" />
        ),
        warning: (
          <WarningIcon className="size-4 text-ir-warning" />
        ),
        error: (
          <XCircleIcon className="size-4 text-ir-danger" />
        ),
        loading: (
          <SpinnerIcon className="size-4 animate-spin text-ir-muted" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--ir-surface)",
          "--normal-text": "var(--ir-text-body)",
          "--normal-border": "var(--ir-border)",
          "--border-radius": "var(--radius-ir-md)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
