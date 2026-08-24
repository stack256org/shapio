"use client";

import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

interface SearchInputProps {
  "aria-label"?: string;
  className?: string;
  debounceMs?: number;
  defaultValue?: string;
  onSearch: (value: string) => void;
  placeholder?: string;
}

// Shared search field for filter toolbars. Built on InputGroup so the
// leading search icon and trailing clear button live in a flex row — the input
// is `flex-1` and truncates within its own space, so even a very long query can
// never overlap or hide the clear button. The value is controlled, so the clear
// (X) button shows the instant there's any text (not after the debounce), and
// the search callback is debounced internally so query behaviour is unchanged.
export function SearchInput({
  defaultValue = "",
  onSearch,
  placeholder = "Search…",
  className,
  debounceMs = 300,
  "aria-label": ariaLabel,
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep the latest callback without re-arming the debounce on every render.
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  function update(next: string, immediate = false) {
    setValue(next);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (immediate) {
      onSearchRef.current(next);
      return;
    }
    debounceRef.current = setTimeout(() => onSearchRef.current(next), debounceMs);
  }

  return (
    <InputGroup className={className}>
      <InputGroupAddon>
        <MagnifyingGlassIcon className="ml-2 text-ir-muted" />
      </InputGroupAddon>
      <InputGroupInput
        aria-label={ariaLabel ?? placeholder}
        autoComplete="off"
        onChange={(e) => update(e.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
      {value.length > 0 && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label="Clear search"
            onClick={() => update("", true)}
            size="icon-xs"
          >
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
