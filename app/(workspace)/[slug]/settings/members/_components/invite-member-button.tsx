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

interface InviteMemberButtonProps {
  canInviteAdmin: boolean;
  isOrbitAdmin: boolean;
  smtpConfigured: boolean;
  workspaceId: string;
}

export function InviteMemberButton({
  workspaceId,
  canInviteAdmin,
  isOrbitAdmin,
  smtpConfigured,
}: InviteMemberButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>
          <UserPlusIcon data-icon="inline-start" />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>
            They'll get an email invite to join this workspace.
          </DialogDescription>
        </DialogHeader>
        <InviteForm
          canInviteAdmin={canInviteAdmin}
          isOrbitAdmin={isOrbitAdmin}
          showHeading={false}
          smtpConfigured={smtpConfigured}
          workspaceId={workspaceId}
        />
      </DialogContent>
    </Dialog>
  );
}
