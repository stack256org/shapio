import { getLabelInfo } from "@/lib/changelog/constants";

interface ChangelogLabelBadgeProps {
  label: string;
  size?: "sm" | "md";
}

export function ChangelogLabelBadge({
  label,
  size = "sm",
}: ChangelogLabelBadgeProps) {
  const { label: displayLabel, color } = getLabelInfo(label);
  const padding =
    size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";

  return (
    <span
      className={`inline-flex items-center rounded-ir-sm font-semibold tracking-wide ${padding}`}
      style={{
        backgroundColor: `${color}18`,
        color,
      }}
    >
      {displayLabel}
    </span>
  );
}
