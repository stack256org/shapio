export const CHANGELOG_LABELS = {
  new_feature: { label: "New Feature", color: "#6366f1" },
  improvement: { label: "Improvement", color: "#3b82f6" },
  bug_fix: { label: "Bug Fix", color: "#f97316" },
  security: { label: "Security", color: "#ef4444" },
  deprecation: { label: "Deprecation", color: "#eab308" },
} as const;

export type ChangelogLabel = keyof typeof CHANGELOG_LABELS;

export const CHANGELOG_LABEL_VALUES = Object.keys(
  CHANGELOG_LABELS
) as ChangelogLabel[];

export function isValidLabel(value: string): value is ChangelogLabel {
  return value in CHANGELOG_LABELS;
}

// Neutral colour for user-created (custom) labels that aren't a built-in.
export const CUSTOM_LABEL_COLOR = "#6b7280";

export function getLabelInfo(label: string): { color: string; label: string } {
  const builtin = CHANGELOG_LABELS[label as ChangelogLabel];
  if (builtin) {
    return builtin;
  }
  // Custom label: display the text as entered, with a neutral colour.
  return { label, color: CUSTOM_LABEL_COLOR };
}
