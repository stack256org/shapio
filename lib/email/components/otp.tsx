import { Section, Text } from "react-email";
import { PRODUCT_NAME } from "@/config/platform";
import { EmailLayout, emailStyles } from "@/lib/email/components/layout";

export function OtpEmail({
  email,
  otp,
  productName = PRODUCT_NAME,
}: {
  email: string;
  otp: string;
  productName?: string;
}) {
  return (
    <EmailLayout
      preview={`Your ${productName} sign-in code: ${otp}`}
      productName={productName}
    >
      <Text style={emailStyles.heading}>Sign in to {productName}</Text>
      <Text style={emailStyles.paragraph}>
        Use this code to sign in as{" "}
        <strong style={{ color: "#171717" }}>{email}</strong>.
      </Text>
      <Section style={{ margin: "24px 0", textAlign: "center" }}>
        <Text
          style={{
            backgroundColor: "#f6f4ef",
            border: "1px solid #ded8cc",
            borderRadius: "8px",
            color: "#111111",
            display: "inline-block",
            fontSize: "32px",
            fontWeight: 800,
            letterSpacing: "8px",
            margin: 0,
            padding: "14px 24px",
          }}
        >
          {otp}
        </Text>
      </Section>
      <Text style={emailStyles.muted}>
        This code expires shortly and can only be used once. If you did not
        request it, you can ignore this email.
      </Text>
    </EmailLayout>
  );
}
