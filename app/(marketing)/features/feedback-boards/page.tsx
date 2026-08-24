import { CaretUpIcon, ChatCircleIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Feedback Boards",
  description:
    "One place for every feature request. Users submit and vote. You ship what matters most — not what the loudest voice asked for.",
};

const STATUS_FILTERS = [
  "All",
  "Open",
  "Planned",
  "In Progress",
  "Done",
] as const;

const POSTS = [
  {
    votes: 67,
    title: "Dark mode support",
    status: "Planned",
    category: "Design",
    comments: 14,
    voted: true,
  },
  {
    votes: 42,
    title: "Custom webhook integrations",
    status: "In Progress",
    category: "Developer",
    comments: 11,
    voted: false,
  },
  {
    votes: 31,
    title: "Export feedback to CSV",
    status: "Planned",
    category: "Data",
    comments: 7,
    voted: false,
  },
  {
    votes: 24,
    title: "Two-factor authentication",
    status: "Planned",
    category: "Security",
    comments: 5,
    voted: false,
  },
  {
    votes: 18,
    title: "Zapier integration",
    status: "Open",
    category: "Integrations",
    comments: 3,
    voted: false,
  },
] as const;

const BENEFITS = [
  {
    heading: "No more hunting for feedback.",
    body: "All feature requests live in one public board not scattered across email, Slack, and Notion. Users find what they're looking for instead of creating duplicate requests.",
  },
  {
    heading: "Real signal, not loud voices.",
    body: "Vote counts show exactly which problems block the most users. One vocal user asking repeatedly ranks below forty users who each upvoted once.",
  },
  {
    heading: "Your team always knows what to build.",
    body: "A ranked, filtered, organized list of validated requests. Open the board and immediately see the highest-impact work no estimation needed.",
  },
] as const;

const FEATURE_LIST = [
  "Public & private boards",
  "Post submission & upvoting",
  "Comments & discussion threads",
  "Post status management",
  "Merge duplicate posts",
  "Custom categories & tags",
  "Post moderation queue",
  "Guest voting no signup needed",
  "Sort by votes, recent, or trending",
  "Board search & filtering",
  "Custom board branding",
  "Embeddable board widget",
] as const;

function BoardMockup() {
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
            feedback.acme.com/boards/feature-requests
          </span>
        </div>
      </div>

      {/* Board header */}
      <div className="flex items-center justify-between border-b border-ir-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ir-heading">
            Feature Requests
          </span>
          <span className="text-2xs font-semibold uppercase tracking-ui text-ir-muted">
            67 posts
          </span>
        </div>
        <span className="rounded-ir-sm border border-ir-border px-2 py-0.5 text-2xs font-semibold uppercase tracking-ui text-ir-heading">
          + Submit Idea
        </span>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-px border-b border-ir-border px-4">
        {STATUS_FILTERS.map((filter, i) => (
          <span
            className={`px-2.5 py-2 text-2xs font-semibold uppercase tracking-ui ${
              i === 0
                ? "border-b border-ir-primary text-ir-heading"
                : "text-ir-muted"
            }`}
            key={filter}
          >
            {filter}
          </span>
        ))}
      </div>

      {/* Post list */}
      <div className="divide-y divide-ir-border">
        {POSTS.map((post) => (
          <div className="flex items-stretch" key={post.title}>
            <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-ir-border px-2 py-3">
              <CaretUpIcon
                aria-hidden="true"
                className={`size-3.5 ${post.voted ? "text-ir-success" : "text-ir-muted"}`}
              />
              <span
                className={`font-mono text-sm font-semibold ${post.voted ? "text-ir-success" : "text-ir-heading"}`}
              >
                {post.votes}
              </span>
            </div>
            <div className="min-w-0 flex-1 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm font-medium text-ir-heading">
                  {post.title}
                </span>
                <span
                  className={`shrink-0 text-2xs font-semibold uppercase tracking-ui ${
                    post.status === "Open" ? "text-ir-muted" : "text-ir-success"
                  }`}
                >
                  {post.status}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-ir-muted">
                <span className="text-2xs font-semibold uppercase tracking-ui">
                  {post.category}
                </span>
                <span className="text-2xs">·</span>
                <div className="flex items-center gap-1">
                  <ChatCircleIcon aria-hidden="true" className="size-3" />
                  <span className="text-2xs">{post.comments}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeedbackBoardsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-ir-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <p className="font-bold text-xs uppercase tracking-eyebrow text-ir-success">
            Feedback Boards
          </p>
          <h1 className="mt-4 font-black text-5xl tracking-normal text-ir-heading sm:text-6xl">
            One place for every
            <br className="hidden sm:block" /> feature request.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ir-muted">
            Users submit ideas, vote on what matters most, and leave comments.
            You get a ranked, organized list of exactly what to build next.
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
            <BoardMockup />
            <div>
              <p className="font-bold text-xs uppercase tracking-eyebrow text-ir-muted">
                What&apos;s Included
              </p>
              <h2 className="mt-4 font-bold text-2xl text-ir-heading">
                Everything you need to collect and organize feedback.
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
            Ready to hear from your users?
          </h2>
          <p className="mt-3 text-lg text-ir-muted">
            No credit card required. Set up your first board in minutes.
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
