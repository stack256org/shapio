interface RoadmapStatusHeaderProps {
  color: string;
  count: number;
  name: string;
}

// Shared column-header treatment for both the derived (feedback-synced) board
// and the manual board — same status pill/count look in either mode.
export function RoadmapStatusHeader({
  name,
  color,
  count,
}: RoadmapStatusHeaderProps) {
  return (
    <div
      className="mb-3 flex items-center justify-between gap-2 rounded-ir-md border border-ir-border px-4 py-3"
      style={{ backgroundColor: `${color}12` }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="inline-block size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h2 className="truncate text-sm font-semibold text-ir-heading">
          {name}
        </h2>
      </div>
      <span
        className="inline-flex shrink-0 items-center rounded-ir-full px-2 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {count}
      </span>
    </div>
  );
}
