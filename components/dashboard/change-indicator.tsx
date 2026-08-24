import {
  TrendDownIcon as TrendDown,
  TrendUpIcon as TrendUp,
} from "@phosphor-icons/react/dist/ssr";

export function ChangeIndicator({
  current,
  previous,
}: {
  current: number;
  previous: number | null;
}) {
  if (previous === null) {
    return null;
  }

  if (previous === 0) {
    return current === 0 ? (
      <span className="text-xs text-ir-muted">—</span>
    ) : (
      <span className="text-xs font-medium text-ir-success">New</span>
    );
  }

  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) {
    return <span className="text-xs text-ir-muted">0%</span>;
  }

  const isUp = pct > 0;
  const Icon = isUp ? TrendUp : TrendDown;
  return (
    <span
      className={`flex items-center gap-1 text-xs font-medium ${isUp ? "text-ir-success" : "text-ir-danger"}`}
    >
      <Icon className="size-3" />
      {isUp ? "+" : ""}
      {pct}%
    </span>
  );
}
