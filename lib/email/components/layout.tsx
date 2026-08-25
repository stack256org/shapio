import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";
import { PRODUCT_NAME } from "@/config/platform";

// Inlined as a data URI (rather than an absolute URL) so the logo always
// renders regardless of whether the app host is publicly reachable from the
// recipient's email client. Pre-sized at 2x (400x131) for a crisp display at
// the 200x66 size it's rendered at below.
const DEFAULT_LOGO_DATA_URL = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "lib/email/assets/logo.png")
).toString("base64")}`;

export const emailStyles = {
  body: {
    backgroundColor: "#f6f4ef",
    color: "#171717",
    fontFamily:
      'Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  button: {
    backgroundColor: "#111111",
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 700,
    padding: "12px 18px",
    textDecoration: "none",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #ded8cc",
    borderRadius: "10px",
    margin: "40px auto",
    maxWidth: "560px",
    padding: "32px",
  },
  fallbackLink: {
    color: "#5c554a",
    fontSize: "12px",
    lineHeight: "20px",
  },
  heading: {
    fontSize: "24px",
    fontWeight: 800,
    letterSpacing: "0",
    lineHeight: "32px",
    margin: "0 0 16px",
  },
  link: { color: "#006d5b" },
  muted: {
    color: "#6b665d",
    fontSize: "13px",
    lineHeight: "22px",
  },
  paragraph: {
    color: "#2c2a26",
    fontSize: "15px",
    lineHeight: "24px",
  },
};

export function EmailLayout({
  children,
  logoUrl,
  preview,
  productName = PRODUCT_NAME,
  unsubscribeUrl,
}: {
  children: ReactNode;
  logoUrl?: string | null;
  preview: string;
  productName?: string;
  // When provided (notification emails only), renders a one-click unsubscribe
  // link in the footer. Transactional emails (magic link, invites) omit it.
  unsubscribeUrl?: string | null;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Section style={{ marginBottom: "24px", textAlign: "left" }}>
            {logoUrl ? (
              <Img
                alt={productName}
                height="32"
                src={logoUrl}
                style={{ display: "block" }}
              />
            ) : (
              <Img
                alt={productName}
                height="66"
                src={DEFAULT_LOGO_DATA_URL}
                style={{ display: "block", objectFit: "contain" }}
                width="200"
              />
            )}
          </Section>
          {children}
          {unsubscribeUrl ? (
            <>
              <Hr style={{ borderColor: "#ded8cc", margin: "28px 0 16px" }} />
              <Text style={{ ...emailStyles.fallbackLink, margin: 0 }}>
                Don't want these notifications?{" "}
                <Link href={unsubscribeUrl} style={emailStyles.link}>
                  Unsubscribe
                </Link>
                .
              </Text>
            </>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}
