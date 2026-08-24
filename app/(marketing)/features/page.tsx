import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/config/platform";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Everything a product team needs to collect feedback, manage a roadmap, and ship with confidence. Every feature included, no per-voter fees.",
};

const MAJOR_FEATURES = [
  {
    title: "Feedback Boards",
    tagline: "One place for every feature request.",
    description:
      "Users submit ideas, vote on what matters most, and leave comments. You get a ranked, organized list of exactly what to build next not what the loudest voice asked for.",
    included: [
      "Public & private boards",
      "Voting & upvoting",
      "Merge duplicate posts",
      "Status management",
    ],
    href: "/features/feedback-boards",
  },
  {
    title: "Public Roadmap",
    tagline: "Your roadmap updates itself.",
    description:
      "Change a post status and it moves on your public roadmap instantly. No separate Notion doc to maintain. No manual sync between tools.",
    included: [
      "Auto-syncs with board statuses",
      "Custom status labels",
      "Public shareable URL",
      "User-facing roadmap portal",
    ],
    href: "/features/roadmap",
  },
  {
    title: "Changelog",
    tagline: "Every voter hears from you automatically.",
    description:
      "Write a release note, link the posts you shipped, and Shapio emails every voter automatically. The loop closes without any manual work.",
    included: [
      "Release notes with linked posts",
      "Automatic voter notifications",
      "Public changelog page",
      "Subscribe & RSS feed",
    ],
    href: "/features/changelog",
  },
] as const;

const ALL_FEATURES = [
  {
    category: "Feedback Boards",
    items: [
      "Voting boards (public & private)",
      "Post submission & comments",
      "Merge duplicate posts",
      "Custom categories & tags",
      "Post moderation queue",
      "Sort by votes, recent, or trending",
      "Guest voting no signup needed",
      "Board search & filtering",
    ],
  },
  {
    category: "Public Roadmap",
    items: [
      "Kanban-style roadmap view",
      "Auto-sync with post statuses",
      "Custom status labels",
      "Estimated launch dates",
      "Public roadmap URL",
      "Filter by board or category",
      "Follow specific roadmap items",
    ],
  },
  {
    category: "Changelog",
    items: [
      "Release notes with markdown",
      "Link posts to releases",
      "Auto-notify voters on publish",
      "Public changelog page",
      "Changelog subscribe & RSS",
      "Release categories (feature, fix, improvement)",
    ],
  },
  {
    category: "Team & Platform",
    items: [
      "Team roles & permissions",
      "Custom branding & domain",
      "Email notifications",
      "Self-hosted option",
    ],
  },
] as const;

export default function FeaturesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-ir-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <p className="font-bold text-xs uppercase tracking-eyebrow text-ir-success">
            Features
          </p>
          <h1 className="mt-4 font-black text-5xl tracking-normal text-ir-heading sm:text-6xl">
            Close the feedback loop,
            <br className="hidden sm:block" /> automatically.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ir-muted">
            From the first feature request to the shipped notification —
            {PRODUCT_NAME} connects every step in one place. No duct tape, no
            manual sync.
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

      {/* 3 major feature panels */}
      <section className="border-y border-ir-border bg-ir-muted-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <div className="grid gap-px overflow-hidden rounded-ir-lg bg-ir-border sm:grid-cols-3">
            {MAJOR_FEATURES.map(
              ({ title, tagline, description, included, href }) => (
                <div
                  className="flex flex-col bg-ir-muted-surface p-8"
                  key={title}
                >
                  <h2 className="text-xl font-bold text-ir-heading">{title}</h2>
                  <p className="mt-1 text-sm font-semibold text-ir-success">
                    {tagline}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-ir-muted">
                    {description}
                  </p>
                  <ul className="mt-5 space-y-2">
                    {included.map((item) => (
                      <li
                        className="flex items-center gap-2 text-sm text-ir-heading"
                        key={item}
                      >
                        <span
                          aria-hidden="true"
                          className="shrink-0 font-mono text-ir-success"
                        >
                          ✓
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    className="mt-auto inline-flex items-center gap-1.5 rounded-ir-sm pt-6 text-sm font-semibold text-ir-heading transition-colors duration-150 ease-ir-standard hover:text-ir-primary"
                    href={href}
                  >
                    Explore {title}
                    <ArrowRightIcon aria-hidden="true" className="size-3.5" />
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Full features list */}
      <section className="bg-ir-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <p className="font-bold text-xs uppercase tracking-eyebrow text-ir-muted">
            Everything Included
          </p>
          <h2 className="mt-4 font-bold text-3xl text-ir-heading sm:text-4xl">
            Every feature. Every plan.
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-ir-muted">
            No feature gating. No per-voter fees. No surprise add-ons.
          </p>

          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {ALL_FEATURES.map(({ category, items }) => (
              <div key={category}>
                <p className="border-b border-ir-border pb-2 text-xs font-semibold uppercase tracking-ui text-ir-muted">
                  {category}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {items.map((item) => (
                    <li
                      className="flex items-start gap-2 text-sm text-ir-heading"
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
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ir-border bg-ir-muted-surface">
        <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-8">
          <h2 className="font-black text-3xl text-ir-heading sm:text-4xl">
            Every feature. One flat price.
          </h2>
          <p className="mt-3 text-lg text-ir-muted">
            No credit card required. Voters never pay a seat fee.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/signin">Start Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/demo">View Demo →</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
