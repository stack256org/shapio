import { Button, Section, Text } from "react-email";
import { PRODUCT_NAME } from "@/config/platform";
import { EmailLayout, emailStyles } from "@/lib/email/components/layout";

export function ChangelogEmail({
  workspaceName,
  entryTitle,
  labelText,
  labelColor,
  bodyPreview,
  entryUrl,
  productName = PRODUCT_NAME,
  unsubscribeUrl,
}: {
  workspaceName: string;
  entryTitle: string;
  labelText: string;
  labelColor: string;
  bodyPreview: string;
  entryUrl: string;
  productName?: string;
  unsubscribeUrl?: string | null;
}) {
  return (
    <EmailLayout
      preview={`${labelText}: ${entryTitle}`}
      productName={productName}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text
        style={{
          ...emailStyles.muted,
          fontWeight: 700,
          letterSpacing: "0.05em",
          margin: "0 0 4px",
          textTransform: "uppercase",
        }}
      >
        {workspaceName}
      </Text>
      <Text style={{ ...emailStyles.heading, margin: "0 0 12px" }}>
        {entryTitle}
      </Text>
      <Section style={{ margin: "0 0 16px" }}>
        <span
          style={{
            backgroundColor: `${labelColor}18`,
            borderRadius: "3px",
            color: labelColor,
            fontSize: "12px",
            fontWeight: 600,
            padding: "3px 10px",
          }}
        >
          {labelText}
        </span>
      </Section>
      <Text style={emailStyles.paragraph}>
        A feature you voted for has shipped!
      </Text>
      {bodyPreview ? (
        <Section
          style={{
            borderLeft: "3px solid #d4cfc7",
            margin: "0 0 24px",
            paddingLeft: "16px",
          }}
        >
          <Text style={{ ...emailStyles.paragraph, margin: 0 }}>
            {bodyPreview}
          </Text>
        </Section>
      ) : null}
      <Section style={{ margin: "24px 0" }}>
        <Button href={entryUrl} style={emailStyles.button}>
          Read the full update →
        </Button>
      </Section>
      <Text style={emailStyles.muted}>
        You're receiving this because you voted on a post in {workspaceName}.
      </Text>
    </EmailLayout>
  );
}
