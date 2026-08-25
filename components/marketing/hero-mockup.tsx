import {
  CaretDownIcon,
  CaretUpIcon,
  ChatCircleIcon,
} from "@phosphor-icons/react/dist/ssr";

const STATUS_FILTERS = [
  "All",
  "Open",
  "Planned",
  "In Progress",
  "Done",
] as const;

const POSTS = [
  {
    id: 1,
    title: "Add dark mode support",
    votes: 42,
    status: "Planned",
    category: "Design",
    comments: 8,
    statusClass: "text-ir-success",
    voted: true,
  },
  {
    id: 2,
    title: "Custom webhook integrations",
    votes: 31,
    status: "In Progress",
    category: "Developer",
    comments: 11,
    statusClass: "text-ir-success",
    voted: false,
  },
  {
    id: 3,
    title: "Export feedback to CSV",
    votes: 24,
    status: "Planned",
    category: "Data",
    comments: 6,
    statusClass: "text-ir-success",
    voted: false,
  },
  {
    id: 4,
    title: "Integrate with Zapier",
    votes: 18,
    status: "Open",
    category: "Integrations",
    comments: 3,
    statusClass: "text-ir-muted",
    voted: false,
  },
] as const;

export function HeroMockup() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-ir-lg border border-ir-border bg-ir-surface shadow-ir-lg"
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-ir-border bg-ir-muted-surface px-4 py-3">
        <div className="flex shrink-0 gap-1.5">
          <span className="block size-2.5 rounded-ir-full bg-ir-border" />
          <span className="block size-2.5 rounded-ir-full bg-ir-border" />
          <span className="block size-2.5 rounded-ir-full bg-ir-border" />
        </div>
        <div className="min-w-0 flex-1 rounded-ir-sm border border-ir-border bg-ir-surface px-3 py-1 text-center">
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
        <div className="flex items-center gap-1 text-ir-muted">
          <span className="text-2xs font-semibold tracking-ui uppercase">
            Trending
          </span>
          <CaretDownIcon aria-hidden="true" className="size-3" />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-px border-b border-ir-border px-4">
        {STATUS_FILTERS.map((filter, i) => (
          <span
            className={`px-2.5 py-2 text-2xs font-semibold tracking-ui uppercase ${
              i === 0
                ? "border-b border-ir-primary text-ir-primary"
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
          <div className="flex items-stretch" key={post.id}>
            {/* Vote column */}
            <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-ir-border px-2 py-3">
              <CaretUpIcon
                aria-hidden="true"
                className={`size-4 ${post.voted ? "text-ir-success" : "text-ir-muted"}`}
              />
              <span
                className={`font-mono text-sm font-semibold ${post.voted ? "text-ir-success" : "text-ir-heading"}`}
              >
                {post.votes}
              </span>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <span className="truncate text-sm font-medium text-ir-heading">
                  {post.title}
                </span>
                <span
                  className={`shrink-0 text-2xs font-semibold tracking-ui uppercase ${post.statusClass}`}
                >
                  {post.status}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-ir-muted">
                <span className="text-2xs font-semibold tracking-ui uppercase">
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
