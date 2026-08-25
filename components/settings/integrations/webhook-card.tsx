"use client";

import { memo, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateEmailWebhookSecretAction } from "@/app/actions/integration-settings";
import { SaveBar } from "@/components/settings/integrations/save-bar";
import { SecretField } from "@/components/settings/integrations/secret-field";
import { useDirtyState } from "@/hooks/use-dirty-state";
import {
  type IntegrationSettingsStatus,
  UNCHANGED_SECRET,
} from "@/lib/integration-settings-types";

interface WebhookCardProps {
  onDirtyChange?: (dirty: boolean) => void;
  status: IntegrationSettingsStatus["webhook"];
}

function WebhookCardImpl({ status, onDirtyChange }: WebhookCardProps) {
  const [isSaving, startSave] = useTransition();
  const [justSaved, setJustSaved] = useState(false);

  const [secret, setSecret] = useState("");
  const [cleared, setCleared] = useState(false);

  const { baseline, isDirty, markClean } = useDirtyState({ secret, cleared });

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!justSaved) {
      return;
    }
    const timer = setTimeout(() => setJustSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  function handleSave() {
    startSave(async () => {
      try {
        const result = await updateEmailWebhookSecretAction({
          secret: cleared ? "" : secret.trim() || UNCHANGED_SECRET,
        });

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        setSecret("");
        setCleared(false);
        markClean({ secret: "", cleared: false });
        setJustSaved(true);
      } catch {
        toast.error(
          "Couldn't reach the server. Check your connection and try again."
        );
      }
    });
  }

  function handleDiscard() {
    setSecret(baseline.secret);
    setCleared(baseline.cleared);
  }

  return (
    <div>
      <p className="mb-4 text-xs text-ir-muted">
        Validates delivery-status webhooks posted to{" "}
        <code className="rounded-ir-xs bg-ir-muted-surface px-1 py-0.5">
          /api/webhooks/email
        </code>
        . Only needed if your email provider sends delivery events. Use a long,
        random value (at least 16 characters) — this isn't checked against a
        provider, so a weak secret is the only way it can be wrong.
      </p>

      <div className="max-w-md">
        <SecretField
          cleared={cleared}
          fromEnv={status.secretFromEnv}
          hasValue={status.hasSecret}
          id="email-webhook-secret"
          label="Webhook secret"
          onChange={setSecret}
          onClear={() => {
            setCleared(true);
            setSecret("");
          }}
          value={secret}
        />
      </div>

      <SaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        justSaved={justSaved}
        onDiscard={handleDiscard}
        onSave={handleSave}
      />
    </div>
  );
}

export const WebhookCard = memo(WebhookCardImpl);
