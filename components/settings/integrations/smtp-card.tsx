"use client";

import { memo, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  testSmtpConnectionAction,
  updateSmtpSettingsAction,
} from "@/app/actions/integration-settings";
import { Field, FormGrid } from "@/components/settings/integrations/field";
import { SaveBar } from "@/components/settings/integrations/save-bar";
import { SecretField } from "@/components/settings/integrations/secret-field";
import { Input } from "@/components/ui/input";
import { useDirtyState } from "@/hooks/use-dirty-state";
import {
  type IntegrationSettingsStatus,
  UNCHANGED_SECRET,
} from "@/lib/integration-settings-types";

interface SmtpCardProps {
  onDirtyChange?: (dirty: boolean) => void;
  status: IntegrationSettingsStatus["smtp"];
}

function SmtpCardImpl({ status, onDirtyChange }: SmtpCardProps) {
  const [isSaving, startSave] = useTransition();
  const [isTesting, startTest] = useTransition();
  const [justSaved, setJustSaved] = useState(false);

  const [host, setHost] = useState(status.host);
  const [port, setPort] = useState(status.port ? String(status.port) : "");
  const [user, setUser] = useState(status.user);
  const [from, setFrom] = useState(status.from);
  const [pass, setPass] = useState("");
  const [passCleared, setPassCleared] = useState(false);

  const { baseline, isDirty, markClean } = useDirtyState({
    host,
    port,
    user,
    from,
    pass,
    passCleared,
  });

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

  function passValue() {
    return passCleared ? "" : pass.trim() || UNCHANGED_SECRET;
  }

  function handleSave() {
    startSave(async () => {
      try {
        const result = await updateSmtpSettingsAction({
          host,
          port: port.trim() ? Number(port) : null,
          user,
          from,
          pass: passValue(),
        });

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        setPass("");
        setPassCleared(false);
        markClean({ host, port, user, from, pass: "", passCleared: false });
        setJustSaved(true);
      } catch {
        toast.error(
          "Couldn't reach the server. Check your connection and try again."
        );
      }
    });
  }

  function handleDiscard() {
    setHost(baseline.host);
    setPort(baseline.port);
    setUser(baseline.user);
    setFrom(baseline.from);
    setPass(baseline.pass);
    setPassCleared(baseline.passCleared);
  }

  function handleTest() {
    startTest(async () => {
      try {
        const result = await testSmtpConnectionAction({
          host,
          port: port.trim() ? Number(port) : null,
          user,
          from,
          pass: passValue(),
        });

        if (!result.success) {
          toast.error(`Connection failed: ${result.error}`);
          return;
        }
        toast.success("SMTP connection verified");
      } catch {
        toast.error(
          "Couldn't reach the server. Check your connection and try again."
        );
      }
    });
  }

  return (
    <div>
      <FormGrid>
        <Field htmlFor="smtp-host" label="Host" required>
          <Input
            id="smtp-host"
            onChange={(e) => setHost(e.target.value)}
            placeholder="smtp.example.com"
            value={host}
          />
        </Field>

        <Field htmlFor="smtp-port" label="Port" required>
          <Input
            id="smtp-port"
            inputMode="numeric"
            onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))}
            placeholder="587"
            value={port}
          />
        </Field>

        <Field htmlFor="smtp-user" label="Username">
          <Input
            autoComplete="off"
            id="smtp-user"
            onChange={(e) => setUser(e.target.value)}
            placeholder="user@example.com"
            value={user}
          />
        </Field>

        <SecretField
          cleared={passCleared}
          fromEnv={status.passFromEnv}
          hasValue={status.hasPass}
          id="smtp-pass"
          label="Password"
          onChange={setPass}
          onClear={() => {
            setPassCleared(true);
            setPass("");
          }}
          required
          value={pass}
        />

        <Field
          className="sm:col-span-2"
          htmlFor="smtp-from"
          label='"From" address'
          required
        >
          <Input
            id="smtp-from"
            onChange={(e) => setFrom(e.target.value)}
            placeholder={'"Shapio" <noreply@example.com>'}
            value={from}
          />
        </Field>
      </FormGrid>

      <SaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        isTesting={isTesting}
        justSaved={justSaved}
        onDiscard={handleDiscard}
        onSave={handleSave}
        onTest={handleTest}
        testDisabled={!(host && user)}
      />
    </div>
  );
}

export const SmtpCard = memo(SmtpCardImpl);
