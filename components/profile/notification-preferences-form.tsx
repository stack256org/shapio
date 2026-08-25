"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateNotificationPreferencesAction } from "@/app/actions/notifications";
import { Switch } from "@/components/ui/switch";

interface Prefs {
  emailChangelog: boolean;
  emailNewComment: boolean;
  emailStatusChange: boolean;
  inAppChangelog: boolean;
  inAppNewComment: boolean;
  inAppStatusChange: boolean;
}

interface NotificationPreferencesFormProps {
  initialPrefs: Prefs;
}

function PreferenceRow({
  label,
  description,
  emailEnabled,
  inAppEnabled,
  onEmailChange,
  onInAppChange,
  emailDisabled,
  inAppDisabled,
}: {
  label: string;
  description: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  onEmailChange: (v: boolean) => void;
  onInAppChange: (v: boolean) => void;
  emailDisabled: boolean;
  inAppDisabled: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-ir-border py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ir-heading">{label}</p>
        <p className="mt-0.5 text-xs text-ir-muted">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-6">
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Switch renders a native input nested inside the label, which already associates it correctly — biome can't see through the component boundary */}
        <label className="flex cursor-pointer flex-col items-center gap-1.5">
          <span className="text-2xs font-semibold tracking-wide text-ir-muted uppercase">
            Email
          </span>
          <Switch
            checked={emailEnabled}
            disabled={emailDisabled}
            onCheckedChange={onEmailChange}
          />
        </label>
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Switch renders a native input nested inside the label, which already associates it correctly — biome can't see through the component boundary */}
        <label className="flex cursor-pointer flex-col items-center gap-1.5">
          <span className="text-2xs font-semibold tracking-wide text-ir-muted uppercase">
            In-app
          </span>
          <Switch
            checked={inAppEnabled}
            disabled={inAppDisabled}
            onCheckedChange={onInAppChange}
          />
        </label>
      </div>
    </div>
  );
}

export function NotificationPreferencesForm({
  initialPrefs,
}: NotificationPreferencesFormProps) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  // Tracks which individual switches are in flight, so clicking one doesn't
  // disable every switch in the form (each preference updates independently).
  const [pendingKeys, setPendingKeys] = useState<Set<keyof Prefs>>(new Set());

  function handleChange(key: keyof Prefs, value: boolean) {
    const previous = prefs[key];
    setPrefs((p) => ({ ...p, [key]: value }));
    setPendingKeys((prev) => new Set(prev).add(key));

    updateNotificationPreferencesAction({ [key]: value })
      .then((result) => {
        if (!result.success) {
          setPrefs((p) => ({ ...p, [key]: previous })); // rollback
          toast.error(result.error);
        }
      })
      .finally(() => {
        setPendingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      });
  }

  return (
    <div className="divide-y divide-ir-border overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
      <div className="flex items-center justify-between bg-ir-muted-surface px-4 py-3">
        <span className="text-xs font-semibold tracking-wide text-ir-muted uppercase">
          Notification type
        </span>
        <div className="flex items-center gap-6 text-xs font-semibold tracking-wide text-ir-muted uppercase">
          <span className="w-9 text-center whitespace-nowrap">Email</span>
          <span className="w-9 text-center whitespace-nowrap">In-app</span>
        </div>
      </div>

      <div className="divide-y divide-ir-border px-4">
        <PreferenceRow
          description="When a post you voted on changes status (e.g. Planned, In Progress)"
          emailDisabled={pendingKeys.has("emailStatusChange")}
          emailEnabled={prefs.emailStatusChange}
          inAppDisabled={pendingKeys.has("inAppStatusChange")}
          inAppEnabled={prefs.inAppStatusChange}
          label="Status changes"
          onEmailChange={(v) => handleChange("emailStatusChange", v)}
          onInAppChange={(v) => handleChange("inAppStatusChange", v)}
        />
        <PreferenceRow
          description="When someone comments on your post or replies to your comment"
          emailDisabled={pendingKeys.has("emailNewComment")}
          emailEnabled={prefs.emailNewComment}
          inAppDisabled={pendingKeys.has("inAppNewComment")}
          inAppEnabled={prefs.inAppNewComment}
          label="Comments & Replies"
          onEmailChange={(v) => handleChange("emailNewComment", v)}
          onInAppChange={(v) => handleChange("inAppNewComment", v)}
        />
        <PreferenceRow
          description="When a new changelog entry is published for a post you voted on"
          emailDisabled={pendingKeys.has("emailChangelog")}
          emailEnabled={prefs.emailChangelog}
          inAppDisabled={pendingKeys.has("inAppChangelog")}
          inAppEnabled={prefs.inAppChangelog}
          label="Changelog updates"
          onEmailChange={(v) => handleChange("emailChangelog", v)}
          onInAppChange={(v) => handleChange("inAppChangelog", v)}
        />
      </div>
    </div>
  );
}
