"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PortalVerifyPanel } from "./portal-verify-panel";

interface PortalVerifyDialogProps {
  // What the visitor was trying to do, so the prompt explains itself rather
  // than interrupting with a generic "sign in". "identify" is the header's
  // Sign In button — no pending action, they just want to be known.
  action?: "comment" | "identify" | "post" | "vote";
  onOpenChange: (open: boolean) => void;
  onVerified: (identity: { email: string; name: string | null }) => void;
  open: boolean;
  // Escape hatch to the account sign-in screen, for the few portal visitors
  // who do have an account (workspace members). Only the header passes it —
  // mid-page prompts keep the visitor on the page.
  signInHref?: string;
}

const ACTION_COPY: Record<
  NonNullable<PortalVerifyDialogProps["action"]>,
  { description: string; title: string }
> = {
  comment: {
    description: "Confirm your email to join the conversation.",
    title: "Verify your email",
  },
  identify: {
    description:
      "Enter your email and we'll send you a one-time code. No password to remember.",
    title: "Sign in",
  },
  post: {
    description:
      "Confirm your email so the team can follow up on your feedback.",
    title: "Verify your email",
  },
  vote: {
    description: "Confirm your email to add your vote.",
    title: "Verify your email",
  },
};

// Modal wrapper around PortalVerifyPanel for the Public Portal. Used both by
// actions triggered mid-page (vote, comment, submit feedback) and by the
// header's Sign In button — the visitor never leaves the board, and no account
// is created.
export function PortalVerifyDialog({
  action = "post",
  open,
  onOpenChange,
  onVerified,
  signInHref,
}: PortalVerifyDialogProps) {
  const copy = ACTION_COPY[action];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <PortalVerifyPanel
          onVerified={(identity) => {
            onOpenChange(false);
            onVerified(identity);
          }}
        />
        {signInHref && (
          <p className="border-t border-ir-border pt-4 text-center text-xs text-ir-muted">
            Part of the team?{" "}
            <Link
              className="font-medium text-ir-primary transition-opacity duration-150 ease-ir-standard hover:underline"
              href={signInHref}
            >
              Sign in to your account
            </Link>
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
