"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateModerationSettingsAction } from "@/app/actions/workspace-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useDirtyState } from "@/hooks/use-dirty-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

// Arrays aren't reference-comparable, so dirty-tracking compares a stable,
// order-independent string form of the keyword list instead.
function keywordsKey(keywords: string[]): string {
  return [...keywords].sort().join(",");
}

interface Props {
  commentModeration: boolean;
  moderationMode: "off" | "auto" | "manual";
  spamKeywords: string[];
  workspaceId: string;
}

const MODES = [
  {
    value: "off" as const,
    label: "Off",
    description: "All posts are published immediately.",
  },
  {
    value: "auto" as const,
    label: "Auto",
    description: "Posts containing spam keywords are held for review.",
  },
  {
    value: "manual" as const,
    label: "Manual",
    description: "All posts require admin approval before going public.",
  },
];

export function ModerationSettingsForm({
  workspaceId,
  moderationMode,
  commentModeration,
  spamKeywords,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [mode, setMode] = useState(moderationMode);
  const [commentMod, setCommentMod] = useState(commentModeration);
  const [keywords, setKeywords] = useState<string[]>(spamKeywords);
  const [keywordInput, setKeywordInput] = useState("");
  const { isDirty, markClean } = useDirtyState({
    mode,
    commentMod,
    keywords: keywordsKey(keywords),
  });
  useUnsavedChangesGuard(isDirty);

  function addKeyword(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" && e.key !== ",") {
      return;
    }
    e.preventDefault();
    const val = keywordInput.trim().toLowerCase();
    if (!val || keywords.includes(val) || keywords.length >= 50) {
      return;
    }
    setKeywords([...keywords, val]);
    setKeywordInput("");
  }

  function removeKeyword(kw: string) {
    setKeywords(keywords.filter((k) => k !== kw));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateModerationSettingsAction({
        workspaceId,
        moderationMode: mode,
        commentModeration: commentMod,
        spamKeywords: keywords,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Moderation settings saved");
      markClean({ mode, commentMod, keywords: keywordsKey(keywords) });
      router.refresh();
    });
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-ir-heading">
          Post moderation
        </h2>
        <p className="mt-0.5 text-xs text-ir-muted">
          Control how new posts are reviewed before appearing publicly.
        </p>
      </div>

      {/* Mode selector */}
      <RadioGroup
        className="gap-0 divide-y divide-ir-border overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs"
        onValueChange={(v) => setMode(v as typeof mode)}
        value={mode}
      >
        {MODES.map((m) => (
          // biome-ignore lint/a11y/noLabelWithoutControl: RadioGroupItem renders a native input nested inside the label, which already associates it correctly — biome can't see through the component boundary
          <label
            className="flex cursor-pointer items-start gap-3 p-4 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface"
            key={m.value}
          >
            <RadioGroupItem className="mt-0.5" value={m.value} />
            <div>
              <p className="text-sm font-medium text-ir-heading">{m.label}</p>
              <p className="text-xs text-ir-muted">{m.description}</p>
            </div>
          </label>
        ))}
      </RadioGroup>

      {/* Comment moderation toggle */}
      <div className="mt-6 mb-4">
        <h2 className="text-sm font-semibold text-ir-heading">
          Comment moderation
        </h2>
        <p className="mt-0.5 text-xs text-ir-muted">
          Hold new comments for review before they appear.
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-ir-card border border-ir-border bg-ir-surface p-4 shadow-ir-xs">
        <div>
          <p className="text-sm font-medium text-ir-heading">
            Require comment approval
          </p>
          <p className="text-xs text-ir-muted">
            New comments are hidden until approved by an admin.
          </p>
        </div>
        <Switch checked={commentMod} onCheckedChange={setCommentMod} />
      </div>

      {/* Spam keywords */}
      <div className="mt-6 mb-4">
        <h2 className="text-sm font-semibold text-ir-heading">
          Flagged words & phrases
        </h2>
        <p className="mt-0.5 text-xs text-ir-muted">
          Add words commonly used in spam or promotional posts — like "discount
          code," "buy now," or a link (e.g. "http"). Any new post containing one
          is held for review instead of publishing immediately (when moderation
          is Auto or Manual).
        </p>
      </div>
      <div className="rounded-ir-card border border-ir-border bg-ir-surface p-4 shadow-ir-xs">
        <div className="flex min-h-8 flex-wrap gap-1.5">
          {keywords.map((kw) => (
            <span
              className="inline-flex items-center gap-1 rounded-ir-sm bg-ir-muted-surface px-2 py-0.5 text-xs text-ir-heading"
              key={kw}
            >
              {kw}
              <button
                aria-label={`Remove ${kw}`}
                className="ml-0.5 cursor-pointer text-ir-muted hover:text-ir-heading focus-visible:outline-none"
                onClick={() => removeKeyword(kw)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
          {keywords.length === 0 && (
            <span className="text-xs text-ir-muted">
              No flagged words configured.
            </span>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            className="flex-1"
            disabled={keywords.length >= 50}
            maxLength={100}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={addKeyword}
            placeholder='e.g. "discount code", "buy now", "http"…'
            type="text"
            value={keywordInput}
          />
        </div>
        {keywords.length < 50 && (
          <p className="mt-1.5 text-xs text-ir-muted">
            Press Enter or comma to add a word.
          </p>
        )}
        {keywords.length >= 50 && (
          <p className="mt-1 text-xs text-ir-muted">
            Maximum 50 keywords reached.
          </p>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          disabled={isPending || !isDirty}
          onClick={handleSave}
          type="button"
        >
          {isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </section>
  );
}
