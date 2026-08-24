"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react";
import { format, parse } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  disabled?: boolean;
  id?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  // yyyy-MM-dd, matching the native date input format this replaces; "" means
  // no date selected.
  value: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select a date",
  disabled,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;

  function handleSelect(date: Date | undefined) {
    onChange(date ? format(date, "yyyy-MM-dd") : "");
    setOpen(false);
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          className="flex h-12 w-full cursor-pointer items-center gap-2 rounded-ir-input border border-ir-border bg-ir-surface px-3.5 text-left text-sm transition-colors duration-150 ease-ir-standard hover:border-ir-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:pointer-events-none disabled:opacity-50"
          disabled={disabled}
          id={id}
          type="button"
        >
          <CalendarBlankIcon className="size-4 shrink-0 text-ir-muted" />
          <span className={selected ? "text-ir-body" : "text-ir-muted"}>
            {selected ? format(selected, "MMM d, yyyy") : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          autoFocus
          mode="single"
          onSelect={handleSelect}
          selected={selected}
        />
        {selected && (
          <div className="border-t border-ir-border p-2">
            <Button
              className="w-full"
              onClick={() => handleSelect(undefined)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
