import DOMPurify from "isomorphic-dompurify";

export function sanitizeChangelogHtml(html: string): string {
  return DOMPurify.sanitize(html);
}

export function truncateHtmlToText(html: string, maxLength: number): string {
  const stripped = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (stripped.length <= maxLength) {
    return stripped;
  }
  return `${stripped.slice(0, maxLength).trimEnd()}…`;
}
