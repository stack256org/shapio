import { Button, Link, Section, Text } from "react-email";
import { PRODUCT_NAME } from "@/config/platform";
import { EmailLayout, emailStyles } from "@/lib/email/components/layout";

export function CommentReplyEmail({
  parentAuthorName,
  postTitle,
  postUrl,
  replierName,
  replyBody,
  workspaceName,
  productName = PRODUCT_NAME,
  unsubscribeUrl,
}: {
  parentAuthorName: string;
  postTitle: string;
  postUrl: string;
  replierName: string;
  replyBody: string;
  workspaceName: string;
  productName?: string;
  unsubscribeUrl?: string | null;
}) {
  return (
    <EmailLayout
      preview={`${replierName} replied to your comment on ${postTitle}`}
      productName={productName}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={emailStyles.heading}>New reply to your comment</Text>
      <Text style={emailStyles.paragraph}>Hi {parentAuthorName},</Text>
      <Text style={emailStyles.paragraph}>
        <strong style={{ color: "#171717" }}>{replierName}</strong> replied to
        your comment on{" "}
        <strong style={{ color: "#171717" }}>"{postTitle}"</strong> in{" "}
        <strong style={{ color: "#171717" }}>{workspaceName}</strong>.
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
          "{replyBody}"
        </Text>
      </Section>
      <Section style={{ margin: "24px 0" }}>
        <Button href={postUrl} style={emailStyles.button}>
          View Reply
        </Button>
      </Section>
      <Text style={emailStyles.muted}>
        You received this email because someone replied to your comment.
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
