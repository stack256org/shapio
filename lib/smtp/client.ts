import nodemailer from "nodemailer";
import { getSmtpSettings } from "@/lib/integration-settings";

export interface SmtpSendInput {
  html: string;
  idempotencyKey?: string;
  subject: string;
  text?: string;
  to: string | string[];
}

export interface SmtpSendResult {
  id: string;
  status: string;
}

// Read fresh from lib/integration-settings.ts on every call — never cached
// beyond the current request — so an SMTP change made in Admin →
// Integrations (or the setup wizard) applies to the very next email sent,
// with no restart.
export async function isSmtpConfigured() {
  return (await getSmtpSettings()) !== null;
}

export async function sendEmailViaSmtp(
  input: SmtpSendInput
): Promise<SmtpSendResult> {
  const smtp = await getSmtpSettings();

  if (!smtp) {
    console.log("[email:dev]", {
      subject: input.subject,
      text: input.text,
      to: input.to,
    });
    return {
      id: `dev_${input.idempotencyKey ?? Date.now()}`,
      status: "logged",
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const info = await transporter.sendMail({
    from: smtp.from,
    to: Array.isArray(input.to) ? input.to.join(", ") : input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    headers: input.idempotencyKey
      ? { "X-Idempotency-Key": input.idempotencyKey }
      : undefined,
  });

  return {
    id: info.messageId ?? `smtp_${Date.now()}`,
    status: "sent",
  };
}
