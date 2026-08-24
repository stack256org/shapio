import { ChangeIndicator } from "@/components/dashboard/change-indicator";
import { FilterSelect } from "@/components/dashboard/filter-select";
import type {
  BreakdownMetrics,
  BreakdownPeriod,
} from "@/lib/dashboard/queries";
import { cn } from "@/lib/utils";

interface BreakdownCardProps {
  isPending?: boolean;
  metrics: BreakdownMetrics;
  onPeriodChange: (period: BreakdownPeriod) => void;
  period: BreakdownPeriod;
}

const PERIOD_OPTIONS = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "All time", value: "all" },
];

export function BreakdownCard({
  metrics,
  period,
  onPeriodChange,
  isPending,
}: BreakdownCardProps) {
  const rows: { label: string; value: number; previous: number | null }[] = [
    {
      label: "New feedback",
      value: metrics.newFeedback,
      previous: metrics.previous?.newFeedback ?? null,
    },
    {
      label: "Total upvotes",
      value: metrics.totalUpvotes,
      previous: metrics.previous?.totalUpvotes ?? null,
    },
    {
      label: "New comments",
      value: metrics.newComments,
      previous: metrics.previous?.newComments ?? null,
    },
    {
      label: "Active users",
      value: metrics.activeUsers,
      previous: metrics.previous?.activeUsers ?? null,
    },
  ];

  return (
    <div
      className={cn(
        "rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs transition-opacity duration-150 ease-ir-standard",
        isPending && "opacity-60"
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-ir-border px-5 py-4">
        <h2 className="text-sm font-semibold text-ir-heading">Breakdown</h2>
        <FilterSelect
          disabled={isPending}
          onChange={(value) => onPeriodChange(value as BreakdownPeriod)}
          options={PERIOD_OPTIONS}
          value={period}
        />
      </div>
      <div className="divide-y divide-ir-border">
        {rows.map((row) => (
          <div
            className="flex items-center justify-between gap-4 px-5 py-3.5"
            key={row.label}
          >
            <div className="flex items-baseline gap-2.5">
              <span className="text-lg font-semibold tabular-nums text-ir-heading">
                {row.value.toLocaleString()}
              </span>
              <span className="text-sm text-ir-muted">{row.label}</span>
            </div>
            <ChangeIndicator current={row.value} previous={row.previous} />
          </div>
        ))}
      </div>
    </div>
  );
}
