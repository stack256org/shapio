"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { joinViaLinkAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";

export function JoinButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setLoading(true);
    setError(null);
    const result = await joinViaLinkAction(token);
    if (!result.success) {
      setLoading(false);
      setError(result.error);
      return;
    }
    const target = `/${result.data.slug}`;
    // A missing name OR a missing password both route through the same
    // finish-setup screen — it renders whichever pieces are still outstanding.
    router.push(
      result.data.needsProfile || result.data.needsPassword
        ? `/complete-profile?next=${encodeURIComponent(target)}`
        : target
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
      )}
      <Button
        className="w-full"
        disabled={loading}
        onClick={handleJoin}
        type="button"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Joining…
          </span>
        ) : (
          "Join workspace"
        )}
      </Button>
    </div>
  );
}
