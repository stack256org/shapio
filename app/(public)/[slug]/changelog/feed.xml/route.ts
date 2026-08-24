import { notFound } from "next/navigation";
import { getLabelInfo } from "@/lib/changelog/constants";
import { truncateHtmlToText } from "@/lib/changelog/html";
import { listChangelogEntries } from "@/lib/changelog/queries";
import { portalBaseUrl } from "@/lib/urls";
import { getWorkspaceBySlug } from "@/lib/workspaces/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace?.changelogPublic) {
    notFound();
  }

  const { entries } = await listChangelogEntries(workspace.id, {
    includeDrafts: false,
    limit: 50,
  });

  const appUrl = portalBaseUrl();
  const channelUrl = `${appUrl}/${slug}/changelog`;
  const feedUrl = `${channelUrl}/feed.xml`;

  const lastBuildDate =
    entries.length > 0 && entries[0].publishedAt
      ? new Date(entries[0].publishedAt).toUTCString()
      : new Date().toUTCString();

  const items = entries
    .filter((e) => e.publishedAt)
    .map((entry) => {
      const entryUrl = `${appUrl}/${slug}/changelog/${entry.id}`;
      const pubDate = new Date(entry.publishedAt!).toUTCString();
      const description = truncateHtmlToText(entry.body, 500);
      const categoryLabel = getLabelInfo(entry.label).label;

      return `    <item>
      <title><![CDATA[${entry.title}]]></title>
      <link>${entryUrl}</link>
      <description><![CDATA[${description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${entryUrl}</guid>
      <category><![CDATA[${categoryLabel}]]></category>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${workspace.name} Changelog]]></title>
    <link>${channelUrl}</link>
    <description><![CDATA[Product updates and release notes for ${workspace.name}]]></description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
