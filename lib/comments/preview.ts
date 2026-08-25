// Comment bodies are stored as rich-text HTML (rendered with dangerouslySet-
// InnerHTML in the thread). Plain-text surfaces — in-app notifications and email
// previews — must strip that markup, otherwise raw tags like "<p>yes</p>" leak
// into the UI. Block-level tags become spaces so words don't run together.
export function commentPreviewText(html: string, maxLength: number): string {
  const text = html
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trimEnd()}…`;
}
