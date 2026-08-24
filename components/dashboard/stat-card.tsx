import Link from "next/link";
import { ChangeIndicator } from "@/components/dashboard/change-indicator";
import { cn } from "@/lib/utils";

interface StatCardProps {
  href?: string;
  label: string;
  periodLabel?: string;
  previousValue?: number | null;
  value: number | string;
  valueClassName?: string;
  valueStyle?: React.CSSProperties;
}

export function StatCard({
  label,
  value,
  href,
  valueClassName,
  valueStyle,
  previousValue,
  periodLabel,
}: StatCardProps) {
  const showChange = previousValue != null && typeof value === "number";

  const content = (
    <>
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-ir-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums text-ir-heading",
          valueClassName
        )}
        style={valueStyle}
      >
        {value}
      </p>
      {showChange && (
        <div className="mt-2 flex items-center gap-1.5">
          <ChangeIndicator current={value as number} previous={previousValue} />
          {periodLabel && (
            <span className="text-2xs text-ir-muted">vs {periodLabel}</span>
          )}
        </div>
      )}
    </>
  );

  if (!href) {
    return (
      <div className="rounded-ir-card border border-ir-border bg-ir-surface px-5 py-4 shadow-ir-xs">
        {content}
      </div>
    );
  }

  return (
    <Link
      className="block rounded-ir-card border border-ir-border bg-ir-surface px-5 py-4 shadow-ir-xs transition-all duration-150 ease-ir-standard hover:border-ir-primary/30 hover:shadow-ir-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 focus-visible:ring-inset"
      href={href}
    >
      {content}
    </Link>
  );
}
