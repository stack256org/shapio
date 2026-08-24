"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PortalVerifyDialog } from "@/components/portal/portal-verify-dialog";
import { Button } from "@/components/ui/button";

interface PortalSignInButtonProps {
  // Where the "Part of the team?" escape hatch inside the dialog points.
  signInHref: string;
}

/**
 * Sign In control for the Public Portal header.
 *
 * Opens the portal's own email-verification flow in place rather than sending
 * the visitor to /signin. Accounts on this instance are invitation-only, so a
 * customer who follows the app's login screen has nothing to log in with — the
 * way they identify themselves here is a one-time code to their email, the same
 * identity every mid-page prompt (vote, comment, submit) already asks for.
 *
 * Workspace members who genuinely do have an account still reach /signin from
 * the link at the bottom of the dialog.
 */
export function PortalSignInButton({ signInHref }: PortalSignInButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        Sign In
      </Button>
      <PortalVerifyDialog
        action="identify"
        onOpenChange={setOpen}
        // Re-render the server tree so the header swaps to the identity badge
        // and every gated action on the page unlocks.
        onVerified={() => router.refresh()}
        open={open}
        signInHref={signInHref}
      />
    </>
  );
}
