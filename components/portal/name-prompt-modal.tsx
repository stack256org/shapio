"use client";

import { DoorOpenIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { authClient, useSession } from "@/lib/auth-client";

// Magic-link sign-ups get an empty name (Better Auth defaults it to "" when
// none is supplied at sign-in) — this one-time, non-dismissable gate collects
// it on the public portal before letting a signed-in visitor continue. Google
// sign-ins already arrive with a name, so this never shows for them.
export function NamePromptModal() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isPending || !session || session.user.name.trim().length > 0) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setSubmitting(true);
    const result = await authClient.updateUser({ name: trimmed });
    setSubmitting(false);
    if (result.error) {
      toast.error(
        result.error.message ?? "Something went wrong. Please try again."
      );
      return;
    }
    router.refresh();
  }

  return (
    <Dialog onOpenChange={() => undefined} open>
      <DialogContent
        className="text-center sm:max-w-sm"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <div className="flex flex-col items-center gap-3">
          <DoorOpenIcon className="size-12 text-ir-primary" weight="fill" />
          <div>
            <DialogTitle className="text-xl font-semibold normal-case tracking-normal">
              Welcome!
            </DialogTitle>
            <DialogDescription className="mt-1.5">
              We need a little more info about yourself.
            </DialogDescription>
          </div>
        </div>
        <form
          className="flex flex-col items-center gap-2 sm:flex-row"
          onSubmit={handleSubmit}
        >
          <input
            autoFocus
            className="w-full rounded-ir-input border border-ir-border bg-ir-surface px-3 py-2 text-sm text-ir-body placeholder:text-ir-muted focus:outline-none focus:ring-2 focus:ring-ir-primary/40 disabled:opacity-50"
            disabled={submitting}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            value={name}
          />
          <Button
            className="w-full shrink-0 sm:w-auto"
            disabled={submitting || !name.trim()}
            type="submit"
          >
            {submitting ? "Saving…" : "Explore Portal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
