import { CaretUpIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Public Roadmap",
  description:
    "A public roadmap that updates itself. Change a post status and it appears on your roadmap instantly. No Notion doc to maintain.",
};

const ROADMAP_COLUMNS = [
  {
    label: "Planned",
    count: 4,
    cards: [
      { title: "Dark mode support", votes: 67 },
      { title: "Export feedback to CSV", votes: 31 },
      { title: "Two-factor authentication", votes: 24 },
      { title: "Custom email templates", votes: 16 },
    ],
  },
  {
    label: "In Progress",
    count: 2,
    cards: [
      { title: "Custom webhook integrations", votes: 42 },
      { title: "Zapier integration", votes: 18 },
    ],
  },
  {
    label: "Completed",
    count: 8,
    cards: [
      { title: "Board sorting options", votes: 29 },
      { title: "Guest voting via email", votes: 22 },
    ],
  },
] as const;

const BENEFITS = [
  {
    heading: "Always up to date.",
    body: "The roadmap is connected directly to your feedback board statuses. Change a status and the roadmap reflects it immediately no separate update needed.",
  },
  {
    heading: "Users can follow progress.",
    body: "Your users and stakeholders see exactly what's planned, in progress, and shipped. No more 'what are you working on?' emails.",
  },
  {
    heading: "One source of truth.",
    body: "Your team and your users look at the same roadmap. No version mismatches, no out-of-date Notion pages, no confusion.",
  },
] as const;

const FEATURE_LIST = [
  "Kanban-style roadmap view",
  "Auto-sync with post statuses",
  "Custom status labels",
  "Estimated launch dates",
  "Public shareable roadmap URL",
  "User-facing roadmap portal",
  "Filter by board or category",
  "Follow specific roadmap items",
  "Status change notifications",
  "Custom branding & colors",
  "Embeddable roadmap widget",
] as const;

function RoadmapMockup() {
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
            acme.shapio.com/roadmap
          </span>
        </div>
      </div>

      {/* Roadmap header */}
      <div className="flex items-center justify-between border-b border-ir-border px-4 py-3">
        <span className="text-sm font-semibold text-ir-heading">
          Public Roadmap
        </span>
        <span className="text-2xs font-semibold uppercase tracking-ui text-ir-muted">
          Acme Corp
        </span>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-3 divide-x divide-ir-border">
        {ROADMAP_COLUMNS.map(({ label, count, cards }) => (
          <div key={label}>
            <div className="flex items-center justify-between border-b border-ir-border px-3 py-2.5">
              <span className="text-2xs font-semibold uppercase tracking-ui text-ir-heading">
                {label}
              </span>
              <span className="font-mono text-2xs text-ir-muted">{count}</span>
            </div>
            <div className="space-y-2 p-2">
              {cards.map(({ title, votes }) => (
                <div
                  className="rounded-ir-sm border border-ir-border bg-ir-background p-2.5"
                  key={title}
                >
                  <p className="text-xs font-medium leading-4 text-ir-heading">
                    {title}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1 text-ir-muted">
                    <CaretUpIcon aria-hidden="true" className="size-3" />
                    <span className="font-mono text-2xs">{votes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-ir-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <p className="font-bold text-xs uppercase tracking-eyebrow text-ir-success">
            Public Roadmap
          </p>
          <h1 className="mt-4 font-black text-5xl tracking-normal text-ir-heading sm:text-6xl">
            Your roadmap
            <br className="hidden sm:block" /> updates itself.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ir-muted">
            Change a post status and it moves on your public roadmap instantly.
            No Notion doc to maintain. No manual sync between tools.
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
            <RoadmapMockup />
            <div>
              <p className="font-bold text-xs uppercase tracking-eyebrow text-ir-muted">
                What&apos;s Included
              </p>
              <h2 className="mt-4 font-bold text-2xl text-ir-heading">
                A roadmap your users can follow and your team can trust.
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
            Give your users a roadmap they can trust.
          </h2>
          <p className="mt-3 text-lg text-ir-muted">
            No credit card required. Up and running in minutes.
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
