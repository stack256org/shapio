import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import {
  StatusChip,
  type StatusChipVariant,
} from "@/components/settings/integrations/status-chip";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface IntegrationCardProps {
  children: ReactNode;
  description: string;
  icon: Icon;
  statusLabel?: string;
  statusVariant: StatusChipVariant;
  title: string;
  value: string;
}

// One row in the integrations accordion — icon, name, description and
// status collapsed. Unlike the old Radix accordion, the daisyUI/<details>
// version keeps every section's form mounted in the DOM at all times (CSS
// collapses the closed ones), so all four cards' fields exist from first
// paint regardless of which section is open.
export function IntegrationCard({
  value,
  icon: Icon,
  title,
  description,
  statusVariant,
  statusLabel,
  children,
}: IntegrationCardProps) {
  const configureLabel =
    statusVariant === "configured" ? "Manage" : "Configure";

  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="items-center px-5 py-3 hover:no-underline focus-visible:mx-1 focus-visible:w-[calc(100%-0.5rem)]">
        <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-ir-md bg-ir-muted-surface text-ir-heading">
              <Icon aria-hidden="true" className="size-4.5" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-sm font-semibold text-ir-heading">
                {title}
              </span>
              <span className="mt-0.5 hidden text-xs font-normal text-ir-muted sm:block">
                {description}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <StatusChip label={statusLabel} variant={statusVariant} />
            <span className="hidden text-xs font-semibold text-ir-primary sm:inline">
              {configureLabel}
            </span>
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-4">{children}</AccordionContent>
    </AccordionItem>
  );
}
