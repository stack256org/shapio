import {
  CaretUpIcon as CaretUp,
  ChatCircleIcon as ChatCircle,
  LightbulbIcon as Lightbulb,
  RadioIcon as Radio,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { FilterSelect } from "@/components/dashboard/filter-select";
import { RelativeTime } from "@/components/ui/relative-time";
import type { ActivityItem, ActivityType } from "@/lib/dashboard/queries";
import { cn } from "@/lib/utils";

interface LiveStreamCardProps {
  activity: ActivityItem[];
  activityType: ActivityType;
  isPending?: boolean;
  onActivityTypeChange: (activityType: ActivityType) => void;
  workspaceSlug: string;
}

const TYPE_OPTIONS = [
  { label: "All Activity", value: "all" },
  { label: "Feedback", value: "post" },
  { label: "Comments", value: "comment" },
  { label: "Votes", value: "vote" },
];

const TYPE_ICON = {
  post: Lightbulb,
  comment: ChatCircle,
  vote: CaretUp,
} as const;

function describe(item: ActivityItem): string {
  const author = item.authorName ?? "Someone";
  switch (item.type) {
    case "post":
      return `${author} submitted new feedback`;
    case "comment":
      return `${author} commented`;
    case "vote":
      return `${author} voted`;
  }
}

export function LiveStreamCard({
  activity,
  activityType,
  isPending,
  onActivityTypeChange,
  workspaceSlug,
}: LiveStreamCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs transition-opacity duration-150 ease-ir-standard",
        isPending && "opacity-60"
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-ir-border px-5 py-4">
        <h2 className="text-sm font-semibold text-ir-heading">Live Stream</h2>
        <FilterSelect
          disabled={isPending}
          onChange={(value) => onActivityTypeChange(value as ActivityType)}
          options={TYPE_OPTIONS}
          value={activityType}
        />
      </div>

      {activity.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-12 text-center">
          <div className="flex size-10 items-center justify-center rounded-ir-full bg-ir-muted-surface text-ir-muted">
            <Radio className="size-5" />
          </div>
          <p className="text-sm text-ir-muted">No recent activity</p>
        </div>
      ) : (
        <ul className="max-h-96 divide-y divide-ir-border overflow-y-auto">
          {activity.map((item) => {
            const Icon = TYPE_ICON[item.type];
            return (
              <li key={`${item.type}-${item.id}`}>
                <Link
                  className="flex items-start gap-3 px-5 py-3 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface"
                  href={`/${workspaceSlug}/feedback/${item.postId}`}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-ir-full border border-ir-border bg-ir-muted-surface text-ir-muted">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ir-body">
                      {describe(item)} <span className="text-ir-muted">on</span>{" "}
                      <span className="font-medium text-ir-heading">
                        {item.postTitle}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-ir-muted">
                      {item.boardName} ·{" "}
                      <RelativeTime
                        date={item.createdAt}
                        options={{ addSuffix: true }}
                      />
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
