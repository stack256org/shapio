import {
  Calendar,
  Clock,
  FileText,
  Globe,
  ListChecks,
  type LucideIcon,
  Map as MapIcon,
  Megaphone,
  Tags,
  User,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/ui/relative-time";
import { SquareAvatar } from "@/components/ui/square-avatar";
import { cn } from "@/lib/utils";

interface WorkspaceOverviewCardProps {
  boardIsPublic: boolean | null;
  categoriesCount: number;
  changelogPublic: boolean;
  createdAt: Date;
  description: string | null;
  isSuspended: boolean;
  logoUrl: string | null;
  memberCount: number;
  name: string;
  ownerName: string | null;
  postsCount: number;
  roadmapPublic: boolean;
  slug: string;
  statusesCount: number;
  updatedAt: Date;
}

interface InfoRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span
        aria-hidden
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-ir-md bg-ir-muted-surface text-ir-muted"
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xs font-medium text-ir-muted">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-ir-heading">
          {value}
        </p>
      </div>
    </div>
  );
}

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: number;
}

function StatTile({ icon: Icon, label, value }: StatTileProps) {
  return (
    <div className="flex items-center gap-3 rounded-ir-lg px-3 py-2.5 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-ir-md bg-ir-muted-surface text-ir-primary"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-lg leading-none font-semibold tabular-nums text-ir-heading">
          {value}
        </p>
        <p className="mt-1 text-2xs font-medium text-ir-muted">{label}</p>
      </div>
    </div>
  );
}

export function WorkspaceOverviewCard({
  boardIsPublic,
  categoriesCount,
  changelogPublic,
  createdAt,
  description,
  isSuspended,
  logoUrl,
  memberCount,
  name,
  ownerName,
  postsCount,
  roadmapPublic,
  slug,
  statusesCount,
  updatedAt,
}: WorkspaceOverviewCardProps) {
  const boardLabel =
    boardIsPublic === null ? "No board" : boardIsPublic ? "Public" : "Private";

  return (
    <section
      aria-labelledby="workspace-overview-heading"
      className="animate-in fade-in rounded-ir-card border border-ir-border bg-ir-surface p-6 shadow-ir-xs transition-shadow duration-300 ease-ir-standard hover:shadow-ir-sm sm:p-7"
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {/* Workspace identity */}
        <div className="flex min-w-0 gap-4 md:col-span-2 lg:col-span-1">
          <SquareAvatar
            alt={name}
            className="size-16 shrink-0 rounded-ir-lg bg-ir-primary-light/20 text-lg font-semibold text-ir-primary ring-1 ring-ir-border sm:size-[4.5rem]"
            fallback={name.charAt(0).toUpperCase()}
            imageUrl={logoUrl}
          />
          <div className="min-w-0 space-y-2.5">
            <div>
              <h2
                className="truncate text-2xl font-semibold tracking-tight text-ir-heading"
                id="workspace-overview-heading"
              >
                {name}
              </h2>
              {description && (
                <p className="mt-1 line-clamp-2 text-sm text-ir-body/80">
                  {description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                className={cn(
                  "h-6 gap-1.5 rounded-full px-2.5 text-2xs normal-case",
                  isSuspended
                    ? "bg-ir-danger/10 text-ir-danger"
                    : "bg-ir-success/10 text-ir-success"
                )}
                variant="ghost"
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    isSuspended ? "bg-ir-danger" : "bg-ir-success"
                  )}
                />
                {isSuspended ? "Suspended" : "Active"}
              </Badge>
              <Badge
                className={cn(
                  "h-6 gap-1.5 rounded-full px-2.5 text-2xs normal-case",
                  boardIsPublic
                    ? "bg-ir-primary/10 text-ir-primary"
                    : "bg-ir-muted-surface text-ir-muted"
                )}
                variant="ghost"
              >
                <Globe aria-hidden className="size-3" />
                {boardLabel}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ir-muted">
              <span className="font-mono">/{slug}</span>
              <span className="flex items-center gap-1">
                <Calendar aria-hidden className="size-3.5" />
                Created{" "}
                <RelativeTime date={createdAt} options={{ addSuffix: true }} />
              </span>
              <span className="flex items-center gap-1">
                <Clock aria-hidden className="size-3.5" />
                Updated{" "}
                <RelativeTime date={updatedAt} options={{ addSuffix: true }} />
              </span>
            </div>
          </div>
        </div>

        {/* Workspace information */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 self-center sm:grid-cols-2">
          <InfoRow
            icon={User}
            label="Owner"
            value={ownerName ?? "Unassigned"}
          />
          <InfoRow icon={Globe} label="Visibility" value={boardLabel} />
          <InfoRow
            icon={MapIcon}
            label="Roadmap"
            value={roadmapPublic ? "Public" : "Private"}
          />
          <InfoRow
            icon={Megaphone}
            label="Changelog"
            value={changelogPublic ? "Public" : "Private"}
          />
        </div>

        {/* Workspace statistics */}
        <div className="grid grid-cols-2 gap-1 self-center">
          <StatTile icon={Users} label="Members" value={memberCount} />
          <StatTile icon={FileText} label="Posts" value={postsCount} />
          <StatTile icon={Tags} label="Categories" value={categoriesCount} />
          <StatTile icon={ListChecks} label="Statuses" value={statusesCount} />
        </div>
      </div>
    </section>
  );
}
