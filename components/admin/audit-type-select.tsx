"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditTypeSelectProps {
  defaultValue: string;
  name: string;
  options: { label: string; value: string }[];
}

// Wraps the shared Select but keeps the surrounding native GET form's
// submit behaviour intact: the chosen value is mirrored into a hidden input so
// the "Filter" button posts it exactly as the old <select name="type"> did.
// The empty "all" option uses a sentinel so the hidden input can distinguish
// "no filter" (submits "") from an unselected control.
export function AuditTypeSelect({
  name,
  defaultValue,
  options,
}: AuditTypeSelectProps) {
  const [value, setValue] = useState(defaultValue || "all");

  return (
    <>
      <input name={name} type="hidden" value={value === "all" ? "" : value} />
      <Select onValueChange={setValue} value={value}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All entity types</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
