import { Button, Link, Section, Text } from "react-email";
import {
  INVITE_EXPIRY_DAYS,
  PRODUCT_NAME,
  workspaceRoleLabel,
} from "@/config/platform";
import { EmailLayout, emailStyles } from "@/lib/email/components/layout";

export function InviteEmail({
  inviterName,
  workspaceName,
  role,
  inviteUrl,
  productName = PRODUCT_NAME,
}: {
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteUrl: string;
  productName?: string;
}) {
  return (
    <EmailLayout
      preview={`${inviterName} invited you to join ${workspaceName}`}
      productName={productName}
    >
      <Text style={emailStyles.heading}>
        You've been invited to join {workspaceName}
      </Text>
      <Text style={emailStyles.paragraph}>
        <strong style={{ color: "#171717" }}>{inviterName}</strong> has invited
        you to join{" "}
        <strong style={{ color: "#171717" }}>{workspaceName}</strong> as a{" "}
        <strong style={{ color: "#171717" }}>{workspaceRoleLabel(role)}</strong>
        .
      </Text>
      <Section style={{ margin: "24px 0" }}>
        <Button href={inviteUrl} style={emailStyles.button}>
          Accept Invitation
        </Button>
      </Section>
      <Text style={emailStyles.muted}>
        This invitation expires in {INVITE_EXPIRY_DAYS} days. If you were not
        expecting this invitation, you can safely ignore this email.
      </Text>
      <Text style={emailStyles.fallbackLink}>
        If the button does not work, paste this link into your browser:{" "}
        <Link href={inviteUrl} style={emailStyles.link}>
          {inviteUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}
