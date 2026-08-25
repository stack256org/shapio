"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({
  className,
  text,
}: {
  className?: string;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable in non-secure context — silent fail
    }
  }

  return (
    <button
      aria-label={copied ? "Copied!" : "Copy to clipboard"}
      className={cn(
        "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-ir-sm text-ir-primary-foreground/40 transition-colors duration-150 ease-ir-standard hover:text-ir-primary-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40",
        className
      )}
      onClick={handleCopy}
      type="button"
    >
      {copied ? (
        <CheckIcon aria-hidden="true" className="size-3.5" />
      ) : (
        <CopyIcon aria-hidden="true" className="size-3.5" />
      )}
    </button>
  );
}
