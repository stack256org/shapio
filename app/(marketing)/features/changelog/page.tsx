import { CaretUpIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Ship with a story. Write a release note, link the posts you shipped, and Shapio automatically notifies every voter.",
};

const BENEFITS = [
  {
    heading: "Close the loop automatically.",
    body: "No manual outreach. Publish a changelog entry and every voter who asked for it gets an email. The feedback loop closes itself.",
  },
  {
    heading: "Build trust with your users.",
    body: "Users who feel heard come back. Showing them you shipped their request and notifying them directly turns feedback into loyalty.",
  },
  {
    heading: "Your changelog is a product feature.",
    body: "A public page your users can subscribe to, reference, and share. Every release tells the story of what got built and why.",
  },
] as const;

const FEATURE_LIST = [
  "Release notes with markdown",
  "Link feedback posts to releases",
  "Auto-notify all voters on publish",
  "Public changelog page",
  "Changelog subscribe & RSS feed",
  "Release categories (feature, fix, improvement)",
  "Custom branding & domain",
  "Scheduled publishing",
  "Email preview before sending",
  "Voter notification history",
  "Changelog search",
] as const;

function ChangelogMockup() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-ir-lg border border-ir-border bg-ir-surface shadow-ir-sm"
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-ir-border bg-ir-muted-surface px-4 py-2.5">
        <div className="flex shrink-0 gap-1.5">
          <span className="block size-2 rounded-ir-full bg-ir-border" />
          <span className="block size-2 rounded-ir-full bg-ir-border" />
          <span className="block size-2 rounded-ir-full bg-ir-border" />
        </div>
        <div className="min-w-0 flex-1 border border-ir-border bg-ir-background px-3 py-0.5 text-center">
          <span className="font-mono text-2xs text-ir-muted">
            acme.shapio.com/changelog
          </span>
        </div>
      </div>

      {/* Changelog header */}
      <div className="flex items-center justify-between border-b border-ir-border px-4 py-3">
        <span className="text-sm font-semibold text-ir-heading">Changelog</span>
        <span className="text-2xs font-semibold uppercase tracking-ui text-ir-success">
          Latest
        </span>
      </div>

      {/* Entry */}
      <div className="p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-ir-sm border border-ir-border px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-ui text-ir-success">
            Feature
          </span>
          <span className="text-2xs font-semibold uppercase tracking-ui text-ir-muted">
            Jun 24, 2026
          </span>
        </div>
        <h4 className="mt-3 font-bold text-base text-ir-heading">
          Dark mode is here
        </h4>
        <p className="mt-2 text-sm leading-5 text-ir-muted">
          After 67 votes and months of work, dark mode is now available for all
          workspaces. Toggle it in your profile settings it remembers your
          preference per device.
        </p>

        {/* Linked posts */}
        <div className="mt-5 border-t border-ir-border pt-4">
          <p className="text-2xs font-semibold uppercase tracking-ui text-ir-muted">
            Delivered from your board
          </p>
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2 rounded-ir-sm border border-ir-border bg-ir-muted-surface px-3 py-2">
              <CaretUpIcon
                aria-hidden="true"
                className="size-3.5 text-ir-muted"
              />
              <span className="font-mono text-2xs font-semibold text-ir-muted">
                67
              </span>
              <span className="text-xs font-medium text-ir-heading">
                Dark mode support
              </span>
            </div>
          </div>
        </div>

        {/* Notification notice */}
        <div className="mt-4 rounded-ir-sm border border-ir-border bg-ir-muted-surface px-3 py-2.5">
          <p className="text-2xs text-ir-muted">
            <span className="font-semibold text-ir-heading">
              67 voters notified
            </span>{" "}
            email sent automatically on publish
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ChangelogPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-ir-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <p className="font-bold text-xs uppercase tracking-eyebrow text-ir-success">
            Changelog
          </p>
          <h1 className="mt-4 font-black text-5xl tracking-normal text-ir-heading sm:text-6xl">
            Ship with a story.
            <br className="hidden sm:block" /> Every voter hears from you.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ir-muted">
            Write a release note, link the posts you shipped, and Shapio emails
            every voter automatically. No manual outreach. No one left
            wondering.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signin">Start Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/demo">View Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 3 benefit pillars */}
      <section className="border-y border-ir-border bg-ir-muted-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <div className="grid gap-px overflow-hidden rounded-ir-lg bg-ir-border sm:grid-cols-3">
            {BENEFITS.map(({ heading, body }) => (
              <div className="bg-ir-muted-surface p-8" key={heading}>
                <h3 className="font-bold text-base text-ir-heading">
                  {heading}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ir-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mockup + feature list */}
      <section className="bg-ir-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[7fr_5fr] lg:items-start lg:gap-16">
            <ChangelogMockup />
            <div>
              <p className="font-bold text-xs uppercase tracking-eyebrow text-ir-muted">
                What&apos;s Included
              </p>
              <h2 className="mt-4 font-bold text-2xl text-ir-heading">
                Turn every release into a moment users remember.
              </h2>
              <ul className="mt-8 space-y-2.5">
                {FEATURE_LIST.map((item) => (
                  <li
                    className="flex items-start gap-2.5 text-sm text-ir-heading"
                    key={item}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 font-mono text-ir-success"
                    >
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ir-border bg-ir-muted-surface">
        <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-8">
          <h2 className="font-black text-3xl text-ir-heading sm:text-4xl">
            Turn every release into a moment users remember.
          </h2>
          <p className="mt-3 text-lg text-ir-muted">
            No credit card required. Publish your first changelog in minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/signin">Start Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/features">See All Features →</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
