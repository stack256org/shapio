import { Text } from "react-email";
import { PRODUCT_NAME } from "@/config/platform";
import { EmailLayout, emailStyles } from "@/lib/email/components/layout";

export function MemberRemovedEmail({
  workspaceName,
  productName = PRODUCT_NAME,
}: {
  workspaceName: string;
  productName?: string;
}) {
  return (
    <EmailLayout
      preview={`You have been removed from ${workspaceName}`}
      productName={productName}
    >
      <Text style={emailStyles.heading}>
        You've been removed from a workspace
      </Text>
      <Text style={emailStyles.paragraph}>
        You have been removed from the workspace{" "}
        <strong style={{ color: "#171717" }}>{workspaceName}</strong>. You no
        longer have access to its boards, feedback, or settings.
      </Text>
      <Text style={emailStyles.muted}>
        If you think this was a mistake, please reach out to a workspace admin
        to be invited again.
      </Text>
    </EmailLayout>
  );
}
