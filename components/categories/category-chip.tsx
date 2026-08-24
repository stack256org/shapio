interface CategoryChipProps {
  color: string;
  name: string;
  size?: "sm" | "xs";
}

export function CategoryChip({ name, color, size = "sm" }: CategoryChipProps) {
  const padding =
    size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-ir-full font-medium ${padding}`}
      style={{
        backgroundColor: `${color}18`,
        color,
      }}
    >
      <span
        className="inline-block rounded-ir-full"
        style={{ width: 6, height: 6, backgroundColor: color }}
      />
      {name}
    </span>
  );
}
