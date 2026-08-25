import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Shapio collects, uses, and protects your data.",
};

const SECTIONS = [
  {
    heading: "Information We Collect",
    body: "We collect information you provide directly to us when you create an account, submit feedback, or contact support. This includes your name, email address, and any content you submit through our platform.",
  },
  {
    heading: "How We Use Your Information",
    body: "We use the information we collect to operate and improve Shapio, send you product updates and notifications you have opted into, respond to support requests, and ensure platform security.",
  },
  {
    heading: "Data Storage",
    body: "If you are using a self-hosted instance of Shapio, your data is stored on infrastructure you control. For managed instances, data is stored on servers located within your selected region.",
  },
  {
    heading: "Email Notifications",
    body: "Voters who submit or upvote feedback may receive email notifications when the status of a post changes or when a related changelog entry is published. Every notification includes a one-click unsubscribe link.",
  },
  {
    heading: "Third-Party Services",
    body: "Shapio may integrate with third-party services (such as Slack or Zapier) at your direction. We only share data with third parties when you have explicitly configured an integration.",
  },
  {
    heading: "Contact",
    body: "If you have questions about this Privacy Policy or your data, contact us at privacy@shapio.com.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <section className="bg-ir-background">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-8">
        <p className="font-bold text-xs uppercase tracking-eyebrow text-ir-muted">
          Legal
        </p>
        <h1 className="mt-4 font-black text-4xl tracking-normal text-ir-heading sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-ir-muted">
          Last updated: June 24, 2026
        </p>

        <div className="mt-12 divide-y divide-ir-border border-t border-ir-border">
          {SECTIONS.map(({ heading, body }) => (
            <div className="py-8" key={heading}>
              <h2 className="font-bold text-lg text-ir-heading">{heading}</h2>
              <p className="mt-3 text-sm leading-7 text-ir-muted">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-ir-border pt-8">
          <Link
            className="rounded-ir-sm text-sm font-semibold text-ir-heading transition-colors duration-150 ease-ir-standard hover:text-ir-primary"
            href="/"
          >
            ← Back to Shapio
          </Link>
        </div>
      </div>
    </section>
  );
}
