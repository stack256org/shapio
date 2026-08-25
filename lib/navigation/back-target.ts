// Resolves where a detail page's "Back" control should point. Linking pages may
// pass `?from=<internal path>&fromLabel=<label>` to preserve navigation context
// (e.g. opening a feature from the Roadmap should return to the Roadmap). When
// no valid `from` is present — a direct visit, a shared link, or a link that
// doesn't set it — the page's own fallback (its board / All Feedback) is used,
// so nothing is ever hardcoded to a single route.
export function resolveBackTarget(opts: {
  from?: string;
  fromLabel?: string;
  fallbackHref: string;
  fallbackLabel: string;
}): { href: string; label: string } {
  const { from, fromLabel, fallbackHref, fallbackLabel } = opts;

  // Only honor safe same-origin internal paths — never an absolute URL,
  // protocol-relative "//host", or anything that could redirect off-site.
  const isSafe =
    typeof from === "string" && from.startsWith("/") && !from.startsWith("//");
  if (!isSafe) {
    return { href: fallbackHref, label: fallbackLabel };
  }

  const label =
    typeof fromLabel === "string" && fromLabel.trim().length > 0
      ? fromLabel.trim().slice(0, 40)
      : fallbackLabel;
  return { href: from, label };
}
