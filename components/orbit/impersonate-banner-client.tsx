"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ImpersonateBannerClient({ email }: { email: string }) {
  const [isEnding, setIsEnding] = useState(false);
  const router = useRouter();

  async function handleEndImpersonation() {
    setIsEnding(true);
    try {
      await authClient.admin.stopImpersonating();
      router.push("/orbit");
      router.refresh();
    } catch {
      setIsEnding(false);
    }
  }

  return (
    <div className="fixed inset-x-0 top-0 z-9999 flex items-center justify-between gap-4 border-b border-ir-warning/30 bg-ir-warning/10 px-4 py-2.5 text-ir-warning-foreground">
      <div className="flex items-center gap-2.5 text-sm">
        <span className="text-base">⚠</span>
        <span className="font-semibold">Impersonating</span>
        <span className="font-mono text-xs opacity-80">{email}</span>
      </div>
      <button
        className="shrink-0 cursor-pointer rounded-ir-button border border-ir-warning/40 bg-ir-warning/15 px-3 py-1 text-xs font-semibold uppercase tracking-ui text-ir-warning-foreground transition-colors hover:bg-ir-warning/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:opacity-50"
        disabled={isEnding}
        onClick={handleEndImpersonation}
        type="button"
      >
        {isEnding ? "Ending…" : "End Impersonation"}
      </button>
    </div>
  );
}
