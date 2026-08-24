import { Button, Link, Section, Text } from "react-email";
import { PRODUCT_NAME } from "@/config/platform";
import { EmailLayout, emailStyles } from "@/lib/email/components/layout";

export function ConfirmEmailChangeEmail({
  newEmail,
  confirmUrl,
  productName = PRODUCT_NAME,
}: {
  confirmUrl: string;
  newEmail: string;
  productName?: string;
}) {
  return (
    <EmailLayout
      preview={`Confirm your new email address for ${productName}`}
      productName={productName}
    >
      <Text style={emailStyles.heading}>Confirm your new email address</Text>
      <Text style={emailStyles.paragraph}>
        You requested to change your {productName} account email to{" "}
        <strong style={{ color: "#171717" }}>{newEmail}</strong>. Click the
        button below to confirm.
      </Text>
      <Section style={{ margin: "24px 0" }}>
        <Button href={confirmUrl} style={emailStyles.button}>
          Confirm Email Change
        </Button>
      </Section>
      <Text style={emailStyles.muted}>
        This link expires in 1 hour. If you did not request this change, you can
        safely ignore this email — your account email will not change.
      </Text>
      <Text style={emailStyles.fallbackLink}>
        If the button does not work, paste this link into your browser:{" "}
        <Link href={confirmUrl} style={emailStyles.link}>
          {confirmUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}
