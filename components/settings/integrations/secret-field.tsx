"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SecretFieldProps {
  className?: string;
  cleared: boolean;
  disabled?: boolean;
  fromEnv: boolean;
  hasValue: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  onClear: () => void;
  required?: boolean;
  value: string;
}

/**
 * A password-style field for a secret that may already be saved (in the DB
 * or via .env) without ever showing its plaintext. Typing a new value stages
 * a replacement; "Clear" stages removal; leaving it untouched keeps
 * whatever's already saved — the parent form maps these to the
 * UNCHANGED_SECRET sentinel / "" / the typed value on submit (see
 * app/actions/integration-settings.ts).
 */
export function SecretField({
  id,
  label,
  hasValue,
  fromEnv,
  value,
  onChange,
  onClear,
  cleared,
  disabled,
  required,
  className,
}: SecretFieldProps) {
  const [visible, setVisible] = useState(false);

  const statusText = cleared
    ? "Will be cleared when you save."
    : hasValue
      ? fromEnv
        ? "Currently set via .env — leave blank to keep using it, or enter a new value to store it here instead."
        : "Saved — leave blank to keep the current value."
      : "Not set.";

  return (
    <label className={cn("block", className)} htmlFor={id}>
      <span className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-baseline gap-1 text-sm font-semibold text-ir-heading">
          {label}
          {required && (
            <span aria-hidden="true" className="text-ir-danger">
              *
            </span>
          )}
        </span>
        {hasValue && !cleared && (
          <button
            className="cursor-pointer rounded-ir-xs text-xs font-medium text-ir-muted hover:text-ir-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
            onClick={onClear}
            type="button"
          >
            Clear
          </button>
        )}
      </span>
      <div className="relative">
        <Input
          autoComplete="new-password"
          className="pr-9"
          disabled={disabled || cleared}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={hasValue ? "••••••••••••" : "Not set"}
          type={visible ? "text" : "password"}
          value={cleared ? "" : value}
        />
        <button
          aria-label={visible ? "Hide value" : "Show value"}
          className="-translate-y-1/2 absolute top-1/2 right-2.5 cursor-pointer text-ir-muted hover:text-ir-heading"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          type="button"
        >
          {visible ? (
            <EyeSlash className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </button>
      </div>
      <p className="mt-1 text-xs text-ir-muted">{statusText}</p>
    </label>
  );
}
