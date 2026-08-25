import { Text } from "react-email";
import { PRODUCT_NAME } from "@/config/platform";
import { EmailLayout, emailStyles } from "@/lib/email/components/layout";

export function WorkspaceDeletedEmail({
  workspaceName,
  productName = PRODUCT_NAME,
}: {
  workspaceName: string;
  productName?: string;
}) {
  return (
    <EmailLayout
      preview={`The workspace ${workspaceName} has been deleted`}
      productName={productName}
    >
      <Text style={emailStyles.heading}>Workspace deleted</Text>
      <Text style={emailStyles.paragraph}>
        The workspace{" "}
        <strong style={{ color: "#171717" }}>{workspaceName}</strong> has been
        permanently deleted. You no longer have access to its boards, feedback,
        roadmap, or settings.
      </Text>
      <Text style={emailStyles.muted}>
        If you believe this was a mistake, please contact the workspace owner.
        Deleted workspaces cannot be recovered.
      </Text>
    </EmailLayout>
  );
}
