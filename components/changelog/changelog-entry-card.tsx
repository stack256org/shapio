import { format } from "date-fns";
import Link from "next/link";
import { ChangelogLabelBadge } from "@/components/changelog/changelog-label-badge";
import { truncateHtmlToText } from "@/lib/changelog/html";

interface ChangelogEntryCardProps {
  entry: {
    id: string;
    title: string;
    label: string;
    body: string;
    coverImageUrl: string | null;
    publishedAt: Date | null;
    linkedPostCount: number;
  };
  workspaceSlug: string;
}

export function ChangelogEntryCard({
  entry,
  workspaceSlug,
}: ChangelogEntryCardProps) {
  const excerpt = truncateHtmlToText(entry.body, 220);
  // Into the admin-shell entry page (viewable, read-only for non-admins),
  // not the public portal — this card is only ever rendered inside the
  // workspace settings list, and linking out to the public site would bounce
  // the viewer out of the admin panel entirely.
  const href = `/${workspaceSlug}/settings/changelog/${entry.id}/edit`;

  return (
    <article className="border-b border-ir-border py-8 last:border-0">
      {entry.coverImageUrl && (
        <Link className="mb-4 block" href={href}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* biome-ignore lint/performance/noImgElement: dynamic S3/R2/local upload URL, not known at build time for next/image */}
          <img
            alt=""
            className="max-h-64 w-full rounded-ir-sm border border-ir-border object-cover"
            src={entry.coverImageUrl}
          />
        </Link>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <ChangelogLabelBadge label={entry.label} />
        {entry.publishedAt && (
          <time
            className="text-xs text-ir-muted"
            dateTime={entry.publishedAt.toISOString()}
          >
            {format(entry.publishedAt, "MMM d, yyyy")}
          </time>
        )}
      </div>

      <h2 className="text-lg font-semibold leading-snug text-ir-heading">
        <Link
          className="transition-colors duration-150 ease-ir-standard hover:text-ir-primary"
          href={href}
        >
          {entry.title}
        </Link>
      </h2>

      {excerpt && (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ir-muted">
          {excerpt}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <Link
          className="text-xs font-medium text-ir-primary transition-colors duration-150 ease-ir-standard hover:text-ir-primary-hover"
          href={href}
        >
          Read more →
        </Link>
        {entry.linkedPostCount > 0 && (
          <span className="text-xs text-ir-muted">
            {entry.linkedPostCount} linked post
            {entry.linkedPostCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </article>
  );
}
