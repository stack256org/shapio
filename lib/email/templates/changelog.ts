import { createElement } from "react";
import { PRODUCT_NAME } from "@/config/platform";
import { getLabelInfo } from "@/lib/changelog/constants";
import { ChangelogEmail } from "@/lib/email/components/changelog";
import { renderEmailTemplate } from "@/lib/email/renderer";
import { portalBaseUrl } from "@/lib/urls";

export async function changelogEmailTemplate({
  voterName: _voterName,
  voterEmail: _voterEmail,
  entryTitle,
  entryLabel,
  entryId,
  workspaceSlug,
  workspaceName,
  bodyPreview,
  unsubscribeUrl,
}: {
  voterName: string;
  voterEmail: string;
  entryTitle: string;
  entryLabel: string;
  entryId: string;
  workspaceSlug: string;
  workspaceName: string;
  bodyPreview: string;
  unsubscribeUrl?: string | null;
}) {
  const labelInfo = getLabelInfo(entryLabel);
  const entryUrl = `${portalBaseUrl()}/${workspaceSlug}/changelog/${entryId}`;
  const subject = `[${workspaceName}] ${labelInfo.label}: ${entryTitle}`;

  const html = await renderEmailTemplate(
    createElement(ChangelogEmail, {
      bodyPreview,
      entryTitle,
      entryUrl,
      labelColor: labelInfo.color,
      labelText: labelInfo.label,
      productName: PRODUCT_NAME,
      unsubscribeUrl,
      workspaceName,
    })
  );

  const unsubscribeText = unsubscribeUrl
    ? `\n\nUnsubscribe: ${unsubscribeUrl}`
    : "";

  const text = `${workspaceName}: ${labelInfo.label} — ${entryTitle}

A feature you voted for has shipped!

${bodyPreview ? `${bodyPreview}\n\n` : ""}Read the full update: ${entryUrl}

You're receiving this because you voted on a post in ${workspaceName}.${unsubscribeText}`;

  return { subject, html, text };
}
