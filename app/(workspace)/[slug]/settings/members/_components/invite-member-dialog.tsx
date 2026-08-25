"use client";

import { UserPlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InviteForm } from "./invite-form";

interface InviteMemberDialogProps {
  canInviteAdmin: boolean;
  isOrbitAdmin: boolean;
  smtpConfigured: boolean;
  workspaceId: string;
}

export function InviteMemberDialog({
  workspaceId,
  canInviteAdmin,
  isOrbitAdmin,
  smtpConfigured,
}: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlusIcon data-icon="inline-start" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a Team Member</DialogTitle>
          <DialogDescription>
            They&apos;ll receive an email with a link to join this workspace.
          </DialogDescription>
        </DialogHeader>
        <InviteForm
          canInviteAdmin={canInviteAdmin}
          isOrbitAdmin={isOrbitAdmin}
          onInvited={() => setOpen(false)}
          smtpConfigured={smtpConfigured}
          workspaceId={workspaceId}
        />
      </DialogContent>
    </Dialog>
  );
}
