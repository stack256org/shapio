"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useState } from "react";

interface CodeBlockProps {
  code: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-start justify-between gap-2 rounded-ir-sm border border-ir-border bg-ir-muted-surface">
      <pre className="min-w-0 flex-1 overflow-x-auto p-3 text-xs leading-relaxed text-ir-heading">
        <code>{code}</code>
      </pre>
      <button
        aria-label="Copy code"
        className="m-2 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-ir-xs text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
        onClick={handleCopy}
        type="button"
      >
        {copied ? (
          <CheckIcon className="size-3.5 text-ir-success" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </button>
    </div>
  );
}
