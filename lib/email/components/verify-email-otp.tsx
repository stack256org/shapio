import { Section, Text } from "react-email";
import { PRODUCT_NAME } from "@/config/platform";
import { EmailLayout, emailStyles } from "@/lib/email/components/layout";

// Sibling of OtpEmail for the Public Portal's ACCOUNTLESS flow. Deliberately
// not a variant of that component: its copy ("Sign in to X", "use this code to
// sign in as") promises an account, and this recipient gets none — they are
// only confirming they control the address so their feedback can be attributed.
export function VerifyEmailOtpEmail({
  email,
  otp,
  productName = PRODUCT_NAME,
  workspaceName,
}: {
  email: string;
  otp: string;
  productName?: string;
  workspaceName?: string;
}) {
  const destination = workspaceName ?? productName;

  return (
    <EmailLayout
      preview={`Your verification code: ${otp}`}
      productName={productName}
    >
      <Text style={emailStyles.heading}>Verify your email</Text>
      <Text style={emailStyles.paragraph}>
        Enter this code to confirm{" "}
        <strong style={{ color: "#171717" }}>{email}</strong> and post your
        feedback to {destination}.
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
        This code expires shortly and can only be used once. No account is
        created — this only confirms the address. If you did not request it, you
        can ignore this email.
      </Text>
    </EmailLayout>
  );
}
