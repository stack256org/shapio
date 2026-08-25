"use client";

import { BellIcon, PencilIcon, SignOutIcon } from "@phosphor-icons/react";
import { logoutAction } from "@/app/actions/auth";
import { AccountIdentityForms } from "@/components/profile/account-forms";
import { NotificationPreferencesForm } from "@/components/profile/notification-preferences-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProfileActionsProps {
  email: string;
  image: string | null;
  name: string;
  notificationPrefs: {
    emailChangelog: boolean;
    emailNewComment: boolean;
    emailStatusChange: boolean;
    inAppChangelog: boolean;
    inAppNewComment: boolean;
    inAppStatusChange: boolean;
  };
}

export function ProfileActions({
  email,
  image,
  name,
  notificationPrefs,
}: ProfileActionsProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm">
            <PencilIcon data-icon="inline-start" />
            Edit Profile
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Update your profile picture, name, and email address.
            </DialogDescription>
          </DialogHeader>
          <AccountIdentityForms email={email} image={image} name={name} />
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <BellIcon data-icon="inline-start" />
            Notification Settings
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notification settings</DialogTitle>
            <DialogDescription>
              Choose which email and in-app notifications you'd like to receive.
            </DialogDescription>
          </DialogHeader>
          <NotificationPreferencesForm initialPrefs={notificationPrefs} />
        </DialogContent>
      </Dialog>

      <Button onClick={() => logoutAction()} size="sm" variant="ghost">
        <SignOutIcon data-icon="inline-start" />
        Sign Out
      </Button>
    </div>
  );
}
