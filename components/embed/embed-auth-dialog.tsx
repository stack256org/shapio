"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmbedAuthPanel } from "./embed-auth-panel";

interface EmbedAuthDialogProps {
  onAuthenticated: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

// Modal wrapper around EmbedAuthPanel for actions triggered mid-page inside
// the widget (vote, comment) — the visitor never leaves the feedback view.
export function EmbedAuthDialog({
  open,
  onOpenChange,
  onAuthenticated,
}: EmbedAuthDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Verify your email</DialogTitle>
          <DialogDescription>
            Anyone can leave feedback — we only confirm your email so the team
            can follow up. No account needed.
          </DialogDescription>
        </DialogHeader>
        <EmbedAuthPanel
          onAuthenticated={() => {
            onOpenChange(false);
            onAuthenticated();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
