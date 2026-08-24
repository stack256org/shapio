import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
  htmlFor: string;
  label: string;
  required?: boolean;
}

// Shared label + control + hint layout — every plain (non-secret) input in
// the integrations forms goes through this instead of hand-rolling the same
// label/span/hint markup per field.
export function Field({
  htmlFor,
  label,
  required,
  hint,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("block", className)}>
      <label
        className="mb-1.5 flex items-baseline gap-1 text-sm font-semibold text-ir-heading"
        htmlFor={htmlFor}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-ir-danger">
            *
          </span>
        )}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ir-muted">{hint}</p>}
    </div>
  );
}

// Responsive 2-column row for related fields (Host/Port, Username/Password,
// etc.) — a plain field spans one column; pass sm:col-span-2 on a child to
// make it span the full row.
export function FormGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>
  );
}
