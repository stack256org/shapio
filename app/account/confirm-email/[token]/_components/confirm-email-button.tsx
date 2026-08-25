"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { confirmEmailChangeAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";

export function ConfirmEmailButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await confirmEmailChangeAction(token);
    if (!result.success) {
      setLoading(false);
      setError(result.error);
      return;
    }
    router.push("/post-auth");
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
      )}
      <Button
        className="w-full"
        disabled={loading}
        onClick={handleConfirm}
        type="button"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Confirming…
          </span>
        ) : (
          "Confirm email change"
        )}
      </Button>
    </div>
  );
}
