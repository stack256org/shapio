const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "protonmail.com",
  "msn.com",
];

const MAX_SUGGEST_DISTANCE = 2;

function levenshtein(a: string, b: string): number {
  const dist: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) {
    dist[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    dist[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1,
        dist[i][j - 1] + 1,
        dist[i - 1][j - 1] + cost
      );
    }
  }
  return dist[a.length][b.length];
}

/**
 * Flags a likely mistyped domain on a well-known email provider, e.g.
 * "name@gml.com" -> "name@gmail.com". Returns null when the domain is
 * exact, unrecognized, or too different from any known provider to be
 * confidently a typo (avoids false positives on legitimate custom domains).
 */
export function suggestEmailDomainFix(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) {
    return null;
  }

  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  if (!domain || COMMON_EMAIL_DOMAINS.includes(domain)) {
    return null;
  }

  let best: { domain: string; distance: number } | null = null;
  for (const candidate of COMMON_EMAIL_DOMAINS) {
    const distance = levenshtein(domain, candidate);
    if (
      distance <= MAX_SUGGEST_DISTANCE &&
      (!best || distance < best.distance)
    ) {
      best = { domain: candidate, distance };
    }
  }
  if (!best) {
    return null;
  }

  return `${email.slice(0, at + 1)}${best.domain}`;
}
