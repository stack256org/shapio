"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface GuestIdentityBadgeProps {
  email: string;
  // The display name they gave when verifying, if any. Shown in preference to
  // the address — it is what appears next to their feedback, so the header
  // should agree with the byline on their posts.
  name?: string | null;
}

/**
 * Shows who an accountless visitor is posting as, with a way to forget it.
 * Stands in for the account menu on the Public Portal: there is no account to
 * open, but people still need to see who they are and to correct a wrong
 * identity on a shared machine. The verified address stays available on hover
 * for exactly that check.
 */
export function GuestIdentityBadge({ email, name }: GuestIdentityBadgeProps) {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);

  async function handleClear() {
    setClearing(true);
    try {
      await fetch("/api/portal/otp", { method: "DELETE" });
      router.refresh();
    } finally {
      setClearing(false);
    }
  }

  const label = name?.trim() || email;

  return (
    <div className="flex items-center gap-2">
      <span
        className="hidden max-w-[16rem] truncate text-sm text-ir-muted sm:inline"
        title={label === email ? email : `${label} · ${email}`}
      >
        {label}
      </span>
      <button
        className="cursor-pointer rounded-ir-sm px-2.5 py-1.5 text-sm font-medium text-ir-muted transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={clearing}
        onClick={handleClear}
        type="button"
      >
        {clearing ? "Signing out…" : "Not you?"}
      </button>
    </div>
  );
}
