import { CaretUpIcon, ChatCircleIcon } from "@phosphor-icons/react/dist/ssr";

/* ─── Board mockup ─────────────────────────────────────────────────── */

const BOARD_POSTS = [
  {
    votes: 42,
    title: "Add dark mode support",
    status: "Planned",
    category: "Design",
    comments: 8,
  },
  {
    votes: 31,
    title: "Custom webhook integrations",
    status: "In Progress",
    category: "Developer",
    comments: 11,
  },
  {
    votes: 24,
    title: "Export feedback to CSV",
    status: "Planned",
    category: "Data",
    comments: 6,
  },
] as const;

function BoardMockup() {
  return (
    <div className="overflow-hidden rounded-ir-lg border border-ir-border bg-ir-surface shadow-ir-sm">
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-ir-border bg-ir-muted-surface px-4 py-2.5">
        <div className="flex shrink-0 gap-1.5">
          <span className="block size-2 rounded-ir-full bg-ir-border" />
          <span className="block size-2 rounded-ir-full bg-ir-border" />
          <span className="block size-2 rounded-ir-full bg-ir-border" />
        </div>
        <div className="min-w-0 flex-1 border border-ir-border bg-ir-surface px-3 py-0.5 text-center">
          <span className="font-mono text-2xs text-ir-muted">
            acme.shapio.com/boards/feature-requests
          </span>
        </div>
      </div>
      {/* Board header */}
      <div className="flex items-center justify-between border-b border-ir-border px-4 py-3">
        <span className="text-sm font-semibold text-ir-heading">
          Feature Requests
        </span>
        <span className="text-2xs font-semibold uppercase tracking-ui text-ir-muted">
          48 posts
        </span>
      </div>
      {/* Posts */}
      <div className="divide-y divide-ir-border">
        {BOARD_POSTS.map((post) => (
          <div className="flex items-stretch" key={post.title}>
            <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-ir-border px-2 py-3">
              <CaretUpIcon
                aria-hidden="true"
                className="size-3.5 text-ir-muted"
              />
              <span className="font-mono text-sm font-semibold text-ir-heading">
                {post.votes}
              </span>
            </div>
            <div className="min-w-0 flex-1 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm font-medium text-ir-heading">
                  {post.title}
                </span>
                <span className="shrink-0 text-2xs font-semibold uppercase tracking-ui text-ir-success">
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

/* ─── Roadmap mockup ───────────────────────────────────────────────── */

const ROADMAP_COLUMNS = [
  {
    label: "Planned",
    count: 3,
    cards: [
      "Add dark mode support",
      "Export feedback to CSV",
      "Custom email templates",
    ],
  },
  {
    label: "In Progress",
    count: 2,
    cards: ["Custom webhook integrations", "Zapier integration"],
  },
  {
    label: "Completed",
    count: 6,
    cards: ["Board sorting options", "Guest voting via email"],
  },
] as const;

function RoadmapMockup() {
  return (
    <div className="overflow-hidden rounded-ir-lg border border-ir-border bg-ir-surface shadow-ir-sm">
      {/* Header */}
      <div className="border-b border-ir-border px-4 py-3">
        <span className="text-sm font-semibold text-ir-heading">
          Public Roadmap
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
              {cards.map((title) => (
                <div
                  className="border border-ir-border bg-ir-background p-2.5"
                  key={title}
                >
                  <p className="text-xs font-medium leading-4 text-ir-heading">
                    {title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Changelog mockup ─────────────────────────────────────────────── */

function ChangelogMockup() {
  return (
    <div className="overflow-hidden rounded-ir-lg border border-ir-border bg-ir-surface shadow-ir-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ir-border px-4 py-3">
        <span className="text-sm font-semibold text-ir-heading">Changelog</span>
        <span className="text-2xs font-semibold uppercase tracking-ui text-ir-success">
          Latest
        </span>
      </div>
      {/* Entry */}
      <div className="p-5">
        <div className="flex items-center gap-3">
          <span className="text-2xs font-semibold uppercase tracking-ui text-ir-muted">
            Jun 24, 2026
          </span>
        </div>
        <h4 className="mt-2 font-bold text-base text-ir-heading">
          Dark mode is here
        </h4>
        <p className="mt-2 text-sm leading-5 text-ir-muted">
          After 42 votes and months of work, dark mode is now available for all
          workspaces. Toggle it in your profile settings.
        </p>
        {/* Linked posts */}
        <div className="mt-5 border-t border-ir-border pt-4">
          <p className="text-2xs font-semibold uppercase tracking-ui text-ir-muted">
            Delivered
          </p>
          <div className="mt-2 flex items-center gap-2 border border-ir-border bg-ir-muted-surface px-3 py-2">
            <CaretUpIcon
              aria-hidden="true"
              className="size-3.5 text-ir-muted"
            />
            <span className="font-mono text-2xs font-semibold text-ir-muted">
              42
            </span>
            <span className="text-xs font-medium text-ir-heading">
              Add dark mode support
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Email mockup ─────────────────────────────────────────────────── */

function EmailMockup() {
  return (
    <div className="overflow-hidden rounded-ir-lg border border-ir-border bg-ir-surface shadow-ir-sm">
      {/* Email headers */}
      <div className="space-y-1.5 border-b border-ir-border bg-ir-muted-surface px-4 py-3">
        <div className="flex gap-2">
          <span className="w-14 shrink-0 text-2xs font-semibold text-ir-muted">
            From
          </span>
          <span className="text-2xs text-ir-heading">
            Shapio · Acme Corp &lt;noreply@acme.com&gt;
          </span>
        </div>
        <div className="flex gap-2">
          <span className="w-14 shrink-0 text-2xs font-semibold text-ir-muted">
            To
          </span>
          <span className="text-2xs text-ir-heading">alex@example.com</span>
        </div>
        <div className="flex gap-2">
          <span className="w-14 shrink-0 text-2xs font-semibold text-ir-muted">
            Subject
          </span>
          <span className="text-2xs font-semibold text-ir-heading">
            Dark mode just shipped — you asked for this
          </span>
        </div>
      </div>
      {/* Email body */}
      <div className="space-y-3 p-5 text-sm">
        <p className="text-ir-heading">Hi Alex,</p>
        <p className="leading-5 text-ir-muted">
          Something you voted for just shipped. The team at Acme Corp has
          published a new update.
        </p>
        {/* Changelog card */}
        <div className="border border-ir-border bg-ir-muted-surface p-3">
          <p className="text-xs font-semibold text-ir-heading">
            Dark mode is here
          </p>
          <p className="mt-0.5 text-2xs text-ir-muted">Jun 24, 2026</p>
          <p className="mt-1.5 text-xs leading-4 text-ir-muted">
            Toggle it in your profile settings. Available on all workspaces now.
          </p>
        </div>
        <p className="text-xs text-ir-muted">
          You're receiving this because you voted for this feature.{" "}
          <span className="underline">Unsubscribe</span>
        </p>
      </div>
    </div>
  );
}

/* ─── Tour frame ───────────────────────────────────────────────────── */

const FRAMES = [
  {
    step: "01",
    heading: "Feedback lands where it belongs.",
    caption:
      "Users submit requests directly to your board — no email, no Notion. Vote counts tell you exactly which problems are blocking the most users.",
    Mockup: BoardMockup,
  },
  {
    step: "02",
    heading: "Your roadmap updates itself.",
    caption:
      "Change a post status and it appears on your public roadmap instantly. No separate tool to maintain. No manual sync.",
    Mockup: RoadmapMockup,
  },
  {
    step: "03",
    heading: "Ship with a story.",
    caption:
      "Write a changelog entry and link it to the posts you shipped. Your users see what changed and why.",
    Mockup: ChangelogMockup,
  },
  {
    step: "04",
    heading: "Every voter hears from you.",
    caption:
      "Publishing a changelog entry automatically notifies everyone who voted for the linked posts. The loop closes without any manual work.",
    Mockup: EmailMockup,
  },
] as const;

/* ─── Section ──────────────────────────────────────────────────────── */

export function ProductTour() {
  return (
    <section className="bg-ir-background" id="how-it-works">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
        <p className="font-bold text-xs uppercase tracking-eyebrow text-ir-success">
          Product Tour
        </p>

        <h2 className="mt-4 font-bold text-3xl text-ir-heading sm:text-4xl">
          From idea to inbox, in one place.
        </h2>

        <p className="mt-3 max-w-2xl text-lg text-ir-muted">
          Everything that happens between a user submitting a request and
          receiving a notification that it shipped.
        </p>

        <div className="mt-16 divide-y divide-ir-border border-t border-ir-border">
          {FRAMES.map(({ step, heading, caption, Mockup }, index) => {
            // Zigzag: odd frames (02, 04…) flip sides — mockup left, caption
            // right — instead of every row reading text-then-mockup. The
            // column ratio flips with it so the mockup keeps the wider track
            // regardless of which side it's on.
            const isReversed = index % 2 === 1;
            return (
              <div
                className={`grid gap-8 py-12 lg:items-start lg:gap-16 ${
                  isReversed
                    ? "lg:grid-cols-[7fr_5fr]"
                    : "lg:grid-cols-[5fr_7fr]"
                }`}
                key={step}
              >
                {/* Caption */}
                <div className={isReversed ? "lg:order-2 lg:pt-2" : "lg:pt-2"}>
                  <span className="font-mono text-2xs text-ir-muted">
                    {step}
                  </span>
                  <h3 className="mt-2 font-bold text-xl text-ir-heading">
                    {heading}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-ir-muted">
                    {caption}
                  </p>
                </div>
                {/* Mockup */}
                <div className={isReversed ? "lg:order-1" : undefined}>
                  <Mockup />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
