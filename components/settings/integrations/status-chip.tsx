import { cn } from "@/lib/utils";

export type StatusChipVariant =
  | "configured"
  | "needs-setup"
  | "optional"
  | "testing"
  | "disabled";

const VARIANT_STYLES: Record<StatusChipVariant, string> = {
  configured: "bg-ir-success/10 text-ir-success",
  "needs-setup": "bg-ir-warning/10 text-ir-warning",
  optional: "bg-ir-muted-surface text-ir-muted",
  testing: "bg-ir-primary/10 text-ir-primary",
  disabled: "bg-ir-muted-surface text-ir-muted",
};

const DEFAULT_LABEL: Record<StatusChipVariant, string> = {
  configured: "Configured",
  "needs-setup": "Needs setup",
  optional: "Optional",
  testing: "Testing…",
  disabled: "Disabled",
};

interface StatusChipProps {
  className?: string;
  label?: string;
  variant: StatusChipVariant;
}

// One shared visual vocabulary for every integration's state — used both on
// the collapsed accordion header and inside the Setup Progress checklist, so
// "configured" always means the same green pill everywhere on this page.
export function StatusChip({ variant, label, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-ir-full px-2.5 py-1 text-2xs font-semibold whitespace-nowrap transition-colors duration-150 ease-ir-standard",
        VARIANT_STYLES[variant],
        className
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-current"
      />
      {label ?? DEFAULT_LABEL[variant]}
    </span>
  );
}
