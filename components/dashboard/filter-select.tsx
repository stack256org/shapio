"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterSelectProps {
  disabled?: boolean;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}

// A small controlled Select for in-card filters (Breakdown period, Live
// Stream activity type). The caller owns the state and re-fetches data via a
// Server Action, so changing this never navigates the URL, reloads the rest
// of the page, or resets scroll — unlike the previous searchParams-bound
// version this replaces.
export function FilterSelect({
  disabled,
  onChange,
  options,
  value,
}: FilterSelectProps) {
  return (
    <Select disabled={disabled} onValueChange={onChange} value={value}>
      <SelectTrigger size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
