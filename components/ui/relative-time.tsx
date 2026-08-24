import { formatDistanceToNow, type FormatDistanceToNowOptions } from "date-fns";

interface RelativeTimeProps {
  className?: string;
  date: Date | string;
  options?: FormatDistanceToNowOptions;
}

// formatDistanceToNow is time-sensitive: the server computes it at request
// time, then a Client Component re-computes it again at hydration time —
// often just seconds later, but enough to flip "13 minutes ago" to "14" and
// trigger a hydration mismatch. That drift is expected and harmless for a
// relative-time label, so it's suppressed here rather than letting React
// discard and re-render the whole subtree (its default mismatch behavior),
// which would otherwise cause a visible flash across every timestamp on the
// page. The client's version is used from the next real update onward.
export function RelativeTime({ className, date, options }: RelativeTimeProps) {
  const value = typeof date === "string" ? new Date(date) : date;
  return (
    <span className={className} suppressHydrationWarning>
      {formatDistanceToNow(value, options)}
    </span>
  );
}
