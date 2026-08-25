import {
  ArrowUpIcon,
  BellIcon,
  BookOpenIcon,
  ChartBarIcon,
  SquaresFourIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: SquaresFourIcon,
    title: "Feedback Boards",
    description:
      "Users submit requests directly — no more ideas buried in your inbox or scattered across Slack and Notion.",
  },
  {
    icon: ArrowUpIcon,
    title: "Voting",
    description:
      "Know exactly which problems are blocking the most users, ranked by real signal — not by who emailed you last.",
  },
  {
    icon: ChartBarIcon,
    title: "Public Roadmap",
    description:
      "Your roadmap updates automatically as you change post statuses. No separate Notion page to maintain.",
  },
  {
    icon: BookOpenIcon,
    title: "Changelog",
    description:
      "Every user who requested a feature gets an email the day you ship it. The loop closes automatically.",
  },
  {
    icon: UsersIcon,
    title: "Team Roles",
    description:
      "Your whole team can triage feedback without sharing admin credentials. Invite by email or shareable link.",
  },
  {
    icon: BellIcon,
    title: "Email Notifications",
    description:
      "Users stay informed at every step — status changes, comments, and changelog updates. One-click unsubscribe.",
  },
] as const;

export function FeaturesGrid() {
  return (
    <section className="bg-ir-muted-surface" id="features">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
        <p className="text-xs font-bold tracking-eyebrow text-ir-success uppercase">
          What You Get
        </p>

        <h2 className="mt-4 text-3xl font-bold text-ir-heading sm:text-4xl">
          Everything a product team needs. Nothing they don't.
        </h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              className="rounded-ir-card border border-ir-border bg-ir-surface p-6 shadow-ir-xs transition-shadow duration-150 ease-ir-standard hover:shadow-ir-sm"
              key={title}
            >
              <div className="flex size-9 items-center justify-center rounded-ir-sm bg-ir-primary-light/15 text-ir-primary">
                <Icon aria-hidden="true" className="size-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-ir-heading">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-ir-muted">
                {description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button asChild>
            <Link href="/signin">Start Free</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
