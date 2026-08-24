import { format } from "date-fns";
import Link from "next/link";
import { ChangelogLabelBadge } from "@/components/changelog/changelog-label-badge";
import { ChangelogRenderedBody } from "@/components/changelog/changelog-rendered-body";
import { ImagePreviewThumbnail } from "@/components/ui/image-preview-thumbnail";
import { ContentContainer } from "@/components/ui/page";
import { sanitizeChangelogHtml } from "@/lib/changelog/html";
import type { ChangelogEntryWithPosts } from "@/lib/changelog/queries";

interface ChangelogEntryViewProps {
  entry: ChangelogEntryWithPosts;
  workspaceSlug: string;
}

// Read-only rendering of a changelog entry for Team Members, who can view
// every published entry but can't edit — same route/shell as the admin
// ChangelogEditor, just without any of its write affordances. Reuses the
// same display primitives (label badge, rendered body, cover image) as the
// public entry page, since visually that's exactly what a "view" of this
// entry should look like; linked posts route into the admin feedback pages
// instead of the public board, since the viewer is already inside the
// workspace admin shell.
export function ChangelogEntryView({
  entry,
  workspaceSlug,
}: ChangelogEntryViewProps) {
  const renderedBody = sanitizeChangelogHtml(entry.body);

  return (
    <ContentContainer className="pb-10">
      <div className="pt-8">
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <ChangelogLabelBadge label={entry.label} size="md" />
          {entry.publishedAt && (
            <time
              className="text-sm text-ir-muted"
              dateTime={entry.publishedAt.toISOString()}
            >
              {format(entry.publishedAt, "MMMM d, yyyy")}
            </time>
          )}
        </div>

        {entry.coverImageUrl && (
          <ImagePreviewThumbnail
            className="mb-8 max-h-96 w-full rounded-ir-sm border border-ir-border object-cover"
            src={entry.coverImageUrl}
          />
        )}

        <ChangelogRenderedBody
          className="prose prose-sm wrap-break-word max-w-none text-ir-body prose-headings:font-semibold prose-headings:text-ir-heading prose-a:text-ir-primary prose-code:bg-ir-muted-surface prose-code:px-1 prose-code:py-0.5 prose-pre:bg-ir-muted-surface prose-img:cursor-zoom-in prose-img:rounded-ir-md"
          html={renderedBody}
        />

        {entry.linkedPosts.length > 0 && (
          <div className="mt-12 border-t border-ir-border pt-8">
            <h2 className="mb-4 text-sm font-semibold text-ir-heading">
              Related Feedback
            </h2>
            <div className="space-y-2">
              {entry.linkedPosts.map((post) => {
                const isMerged = !!post.mergedIntoId;
                return (
                  <Link
                    className="flex flex-col gap-0.5 rounded-ir-sm border border-ir-border px-4 py-3 text-sm font-medium transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface"
                    href={`/${workspaceSlug}/feedback/${post.id}`}
                    key={post.id}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span
                        className={`min-w-0 flex-1 truncate ${
                          isMerged
                            ? "text-ir-muted"
                            : "text-ir-heading hover:text-ir-primary"
                        }`}
                      >
                        {post.title}
                      </span>
                      <span className="shrink-0 rounded-ir-sm bg-ir-muted-surface px-2 py-0.5 text-[11px] font-semibold text-ir-muted">
                        {isMerged ? "Merged" : post.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    {isMerged && (
                      <p className="text-xs font-normal text-ir-muted">
                        Merged into {post.mergedIntoTitle ?? "another post"}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ContentContainer>
  );
}
