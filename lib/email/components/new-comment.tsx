import { Button, Link, Section, Text } from "react-email";
import { PRODUCT_NAME } from "@/config/platform";
import { EmailLayout, emailStyles } from "@/lib/email/components/layout";

export function NewCommentEmail({
  postAuthorName,
  postTitle,
  postUrl,
  commenterName,
  commentBody,
  workspaceName,
  productName = PRODUCT_NAME,
  unsubscribeUrl,
}: {
  postAuthorName: string;
  postTitle: string;
  postUrl: string;
  commenterName: string;
  commentBody: string;
  workspaceName: string;
  productName?: string;
  unsubscribeUrl?: string | null;
}) {
  return (
    <EmailLayout
      preview={`${commenterName} commented on your post — ${postTitle}`}
      productName={productName}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={emailStyles.heading}>New comment on your post</Text>
      <Text style={emailStyles.paragraph}>Hi {postAuthorName},</Text>
      <Text style={emailStyles.paragraph}>
        <strong style={{ color: "#171717" }}>{commenterName}</strong> commented
        on your post <strong style={{ color: "#171717" }}>"{postTitle}"</strong>{" "}
        in <strong style={{ color: "#171717" }}>{workspaceName}</strong>.
      </Text>
      <Section
        style={{
          backgroundColor: "#f6f4ef",
          borderLeft: "3px solid #d4cfc7",
          margin: "16px 0",
          padding: "12px 16px",
        }}
      >
        <Text
          style={{ ...emailStyles.paragraph, margin: 0, fontStyle: "italic" }}
        >
          "{commentBody}"
        </Text>
      </Section>
      <Section style={{ margin: "24px 0" }}>
        <Button href={postUrl} style={emailStyles.button}>
          View Comment
        </Button>
      </Section>
      <Text style={emailStyles.muted}>
        You received this email because you are the author of this post. To
        manage your notifications, visit your account settings.
      </Text>
      <Text style={emailStyles.fallbackLink}>
        If the button does not work, paste this link into your browser:{" "}
        <Link href={postUrl} style={emailStyles.link}>
          {postUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}
