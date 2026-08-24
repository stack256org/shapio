"use client";

// Shared hex-color preset picker used anywhere a user assigns a color to a
// record (categories, workspace statuses, roadmap columns). Consolidates what
// used to be three independent copies of the same 12-color palette + swatch
// button markup.
export const COLOR_PRESETS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6b7280",
  "#374151",
] as const;

interface ColorSwatchPickerProps {
  onChange: (color: string) => void;
  value: string;
}

export function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLOR_PRESETS.map((c) => {
        const isSelected = value === c;
        return (
          <button
            aria-label={`Color ${c}`}
            aria-pressed={isSelected}
            className="size-6 cursor-pointer rounded-ir-full border-2 transition-all duration-150 ease-ir-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
            key={c}
            onClick={() => onChange(c)}
            style={{
              backgroundColor: c,
              borderColor: isSelected ? "var(--ir-primary)" : "transparent",
            }}
            title={c}
            type="button"
          />
        );
      })}
    </div>
  );
}
