"use client";

import {
  CloudArrowUpIcon,
  EnvelopeSimpleIcon,
  GoogleLogoIcon,
  WebhooksLogoIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { GoogleOAuthCard } from "@/components/settings/integrations/google-oauth-card";
import { IntegrationCard } from "@/components/settings/integrations/integration-card";
import { SetupProgress } from "@/components/settings/integrations/setup-progress";
import { SmtpCard } from "@/components/settings/integrations/smtp-card";
import type { StatusChipVariant } from "@/components/settings/integrations/status-chip";
import { StorageCard } from "@/components/settings/integrations/storage-card";
import { WebhookCard } from "@/components/settings/integrations/webhook-card";
import { Accordion } from "@/components/ui/accordion";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import type { IntegrationSettingsStatus } from "@/lib/integration-settings-types";

interface IntegrationsPanelProps {
  appUrl: string;
  onDirtyChange?: (dirty: boolean) => void;
  status: IntegrationSettingsStatus;
}

/**
 * One accordion per integration group — only one section stays open at a
 * time. Rendered from Admin → Integrations (app/(orbit)/orbit/integrations)
 * and from the setup wizard's Integrations step — both fetch `status` via
 * getIntegrationSettingsStatusAction and save through the same server
 * actions, so either surface leaves the database in an identical state.
 */
export function IntegrationsPanel({
  status,
  appUrl,
  onDirtyChange,
}: IntegrationsPanelProps) {
  const smtpConfigured = status.smtp.hasPass && !!status.smtp.host;
  const googleConfigured =
    status.google.hasClientSecret && !!status.google.clientId;
  const s3Configured = !!(
    status.storage.region &&
    status.storage.bucket &&
    status.storage.accessKeyId &&
    status.storage.hasSecretAccessKey
  );
  const webhookConfigured = status.webhook.hasSecret;

  const smtpVariant: StatusChipVariant = smtpConfigured
    ? "configured"
    : "needs-setup";
  const googleVariant: StatusChipVariant = googleConfigured
    ? "configured"
    : "optional";
  const storageVariant: StatusChipVariant = s3Configured
    ? "configured"
    : "optional";
  const webhookVariant: StatusChipVariant = webhookConfigured
    ? "configured"
    : "optional";

  // Email is the one integration most workspaces actually need (magic-link
  // sign-in falls back to logging the link to the server console without
  // it), so it's the only section that opens itself — everything else stays
  // collapsed until the admin picks it.
  const [openItem, setOpenItem] = useState<string | undefined>(
    smtpConfigured ? undefined : "smtp"
  );

  // Each card reports its own unsaved-changes state here so the wizard /
  // admin page can warn before navigating away with edits still pending —
  // collapsed cards can be dirty too, so this can't be read off `openItem`.
  const [dirtySections, setDirtySections] = useState<Record<string, boolean>>(
    {}
  );
  const handleSectionDirtyChange = useCallback(
    (key: string, dirty: boolean) => {
      setDirtySections((prev) =>
        prev[key] === dirty ? prev : { ...prev, [key]: dirty }
      );
    },
    []
  );
  const anyDirty = Object.values(dirtySections).some(Boolean);

  useEffect(() => {
    onDirtyChange?.(anyDirty);
  }, [anyDirty, onDirtyChange]);

  // Registers with the app-wide guard so navigating away — the Orbit
  // sidebar, browser Back, a refresh — while any collapsed-or-not card is
  // dirty gets the same confirmation prompt, on both consumers of this
  // panel (Admin -> Integrations and the setup wizard) without either
  // needing its own wiring.
  useUnsavedChangesGuard(anyDirty);

  return (
    <div className="space-y-3">
      <SetupProgress
        items={[
          { key: "smtp", label: "Email", variant: smtpVariant },
          { key: "google", label: "Google OAuth", variant: googleVariant },
          { key: "storage", label: "File storage", variant: storageVariant },
          { key: "webhook", label: "Webhook", variant: webhookVariant },
        ]}
        onSelect={setOpenItem}
      />

      <div className="overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
        <Accordion
          collapsible
          onValueChange={(value) => setOpenItem(value || undefined)}
          type="single"
          value={openItem ?? ""}
        >
          <IntegrationCard
            description="Magic-link sign-in, password resets, and notifications."
            icon={EnvelopeSimpleIcon}
            statusVariant={smtpVariant}
            title="Email (SMTP)"
            value="smtp"
          >
            <SmtpCard
              onDirtyChange={(dirty) => handleSectionDirtyChange("smtp", dirty)}
              status={status.smtp}
            />
          </IntegrationCard>

          <IntegrationCard
            description='Enables "Continue with Google" on the sign-in screen.'
            icon={GoogleLogoIcon}
            statusVariant={googleVariant}
            title="Google sign-in"
            value="google"
          >
            <GoogleOAuthCard
              appUrl={appUrl}
              onDirtyChange={(dirty) =>
                handleSectionDirtyChange("google", dirty)
              }
              status={status.google}
            />
          </IntegrationCard>

          <IntegrationCard
            description="Where uploaded images and attachments are stored."
            icon={CloudArrowUpIcon}
            statusLabel={s3Configured ? "S3 / R2" : "Local disk"}
            statusVariant={storageVariant}
            title="File storage"
            value="storage"
          >
            <StorageCard
              onDirtyChange={(dirty) =>
                handleSectionDirtyChange("storage", dirty)
              }
              status={status.storage}
            />
          </IntegrationCard>

          <IntegrationCard
            description="Validates delivery events from your email provider."
            icon={WebhooksLogoIcon}
            statusVariant={webhookVariant}
            title="Inbound email webhook"
            value="webhook"
          >
            <WebhookCard
              onDirtyChange={(dirty) =>
                handleSectionDirtyChange("webhook", dirty)
              }
              status={status.webhook}
            />
          </IntegrationCard>
        </Accordion>
      </div>
    </div>
  );
}
