import { CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import type { StatusChipVariant } from "@/components/settings/integrations/status-chip";
import { Progress } from "@/components/ui/progress";

export interface SetupProgressItem {
  key: string;
  label: string;
  variant: StatusChipVariant;
}

interface SetupProgressProps {
  items: SetupProgressItem[];
  onSelect: (key: string) => void;
}

// Top-of-page summary: fraction + bar for an at-a-glance read, plus a
// clickable checklist so "what should I configure first" has an answer —
// clicking an item opens that integration's accordion section below.
export function SetupProgress({ items, onSelect }: SetupProgressProps) {
  const completed = items.filter(
    (item) => item.variant === "configured"
  ).length;
  const total = items.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="rounded-ir-card border border-ir-border bg-ir-surface p-3 shadow-ir-xs">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-ir-heading">
            Setup progress
          </h2>
          <p className="mt-0.5 text-xs text-ir-muted">
            {completed} of {total} configured — everything here is optional.
          </p>
        </div>
        <span
          aria-hidden="true"
          className="text-sm font-semibold text-ir-heading tabular-nums"
        >
          {percent}%
        </span>
      </div>

      <Progress
        aria-label="Integrations configured"
        className="mt-2.5"
        value={percent}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => {
          const done = item.variant === "configured";
          return (
            <button
              className="flex cursor-pointer items-center gap-1.5 rounded-ir-full border border-ir-border bg-ir-muted-surface/60 px-2.5 py-0.5 text-xs font-medium text-ir-body transition-colors duration-150 ease-ir-standard hover:border-ir-primary/40 hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/30"
              key={item.key}
              onClick={() => onSelect(item.key)}
              type="button"
            >
              {done ? (
                <CheckCircleIcon
                  className="size-3.5 shrink-0 text-ir-success"
                  weight="fill"
                />
              ) : (
                <CircleIcon className="size-3.5 shrink-0 text-ir-muted" />
              )}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
