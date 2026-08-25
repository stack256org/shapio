"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Callout } from "@/components/settings/integrations/callout";

const STORAGE_KEY = "ir-smtp-nudge-dismissed-at";
const SNOOZE_MS = 15 * 60 * 1000; // reappears 15 min after being closed

export function SmtpNudgeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY));
    const snoozed = dismissedAt && Date.now() - dismissedAt < SNOOZE_MS;
    setVisible(!snoozed);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Callout
      onDismiss={() => {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
        setVisible(false);
      }}
      variant="warning"
    >
      <p className="font-medium text-ir-heading">Email isn&apos;t configured</p>
      <p className="mt-0.5">
        Password resets and member invites won&apos;t be delivered until SMTP is
        set up.{" "}
        <Link href="/orbit/integrations">Configure in Integrations →</Link>
      </p>
    </Callout>
  );
}
