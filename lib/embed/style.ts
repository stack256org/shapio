import type { CSSProperties } from "react";

export interface ParsedEmbedParams {
  accentColor?: string;
  // The board this widget INSTANCE is configured for (widget.js's data-board)
  // — not necessarily the board of the page currently being viewed. Carried
  // across in-widget navigation (e.g. Feedback -> Roadmap -> Feedback) so
  // EmbedNav's "Feedback" tab can always return to the right board instead of
  // guessing from a workspace's public-boards list.
  board?: string;
  isEmbed: boolean;
  // True when rendering inside the widget's fixed-size floating panel (as
  // opposed to an inline embed, which grows to fit its content) — see
  // widget.js's mountFloating for where this is set.
  isPanel: boolean;
  theme?: "light" | "dark";
}

// The query string carries the color WITHOUT its leading "#" (see below for
// why) — this is what's actually valid in the ?accentColor= value.
const BARE_HEX_COLOR = /^[0-9a-fA-F]{6}$/;

// Reads the embed-related query params widget.js appends to the iframe src.
// "auto" theme (and anything unrecognized) intentionally resolves to no
// override — the app has no OS-preference-based dark mode wired up today, so
// "auto" falls back to the default (light) rendering rather than pretending
// to support a theme mode that isn't actually implemented.
//
// accentColor is expected WITHOUT a leading "#" (e.g. "cc1e1e") — a bare "#"
// is a URL fragment delimiter, and this value round-trips through more than
// one encode/decode hop (this page's own query string, then reconstructed
// into a `/signin?next=...` redirect, then through Better Auth's magic-link
// email link and its own internal decoding). A literal "#" surviving that
// chain gets misread as the start of a URL fragment partway through and
// throws "Invalid callbackURL" — stripping it here and re-adding it only
// where it's actually used as a CSS value sidesteps the whole problem.
export function parseEmbedParams(searchParams: {
  accentColor?: string;
  board?: string;
  embed?: string;
  layout?: string;
  theme?: string;
}): ParsedEmbedParams {
  const isEmbed = searchParams.embed === "1";
  const isPanel = isEmbed && searchParams.layout === "panel";
  const theme =
    searchParams.theme === "dark" || searchParams.theme === "light"
      ? searchParams.theme
      : undefined;
  const accentColor =
    searchParams.accentColor && BARE_HEX_COLOR.test(searchParams.accentColor)
      ? `#${searchParams.accentColor}`
      : undefined;
  const board = searchParams.board || undefined;
  return { accentColor, board, isEmbed, isPanel, theme };
}

// Builds the query string used on internal links so embed mode (and the
// admin's chosen theme/accent) survives navigation between embedded pages.
export function buildEmbedQuery(params: ParsedEmbedParams): string {
  if (!params.isEmbed) {
    return "";
  }
  const qs = new URLSearchParams({ embed: "1" });
  if (params.board) {
    qs.set("board", params.board);
  }
  if (params.theme) {
    qs.set("theme", params.theme);
  }
  if (params.accentColor) {
    // Strip the "#" — see the comment on parseEmbedParams for why.
    qs.set("accentColor", params.accentColor.replace("#", ""));
  }
  if (params.isPanel) {
    qs.set("layout", "panel");
  }
  return `?${qs.toString()}`;
}

// className + inline style to spread onto an embedded page's root wrapper —
// applies the `.dark` class for a forced dark theme, and overrides daisyUI's
// --color-primary/--color-primary-content theme variables so primary actions
// (vote button, "New post", etc.) pick up the workspace's configured accent
// color.
export function embedWrapperProps(params: ParsedEmbedParams): {
  className: string;
  style: CSSProperties;
} {
  const style: Record<string, string> = {};
  if (params.accentColor) {
    style["--color-primary"] = params.accentColor;
    style["--color-primary-content"] = contrastForeground(params.accentColor);
  }
  return {
    className: params.theme === "dark" ? "dark" : "",
    style: style as CSSProperties,
  };
}

function contrastForeground(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}
