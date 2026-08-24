"use client";

import {
  CheckCircleIcon,
  SpinnerIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkSlugAction } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";

interface StepWorkspaceProps {
  appHost: string;
  error?: string | null;
  /** When the error above applies to a specific field (e.g. "slug"), it's
   * shown inline next to that field instead of in the generic banner. */
  errorField?: string;
  /** Omit to hide the Back button (e.g. once a prior step can't be undone). */
  onBack?: () => void;
  onSubmit: (input: { description: string; slug: string }) => void;
  submitting: boolean;
  workspaceName: string;
}

type SlugState = "idle" | "checking" | "available" | "taken" | "invalid";

export function StepWorkspace({
  workspaceName,
  appHost,
  onBack,
  onSubmit,
  submitting,
  error,
  errorField,
}: StepWorkspaceProps) {
  const [slug, setSlug] = useState(() => slugify(workspaceName));
  const [slugLocked, setSlugLocked] = useState(false);
  const [description, setDescription] = useState("");
  const [slugState, setSlugState] = useState<SlugState>("idle");
  const [slugMessage, setSlugMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkSlug = useCallback(async (value: string) => {
    if (!value || value.length < 2) {
      setSlugState("idle");
      setSlugMessage(null);
      return;
    }
    setSlugState("checking");
    const result = await checkSlugAction(value);
    if (result.available) {
      setSlugState("available");
      setSlugMessage(null);
    } else {
      setSlugState(
        result.error?.includes("format") ||
          result.error?.includes("Must be") ||
          result.error?.includes("Only lowercase") ||
          result.error?.includes("consecutive")
          ? "invalid"
          : "taken"
      );
      setSlugMessage(result.error ?? "Not available.");
    }
  }, []);

  // Keep the slug in sync with the workspace name from Step 1, unless the
  // visitor has since hand-edited it — same "auto until touched" behavior as
  // the standalone workspace-creation form.
  useEffect(() => {
    if (slugLocked) {
      return;
    }
    const generated = slugify(workspaceName);
    setSlug(generated);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (generated.length >= 2) {
      setSlugState("checking");
      debounceRef.current = setTimeout(() => checkSlug(generated), 400);
    } else {
      setSlugState("idle");
      setSlugMessage(null);
    }
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [workspaceName, slugLocked, checkSlug]);

  function handleSlugChange(value: string) {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(sanitized);
    setSlugLocked(true);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (sanitized.length >= 2) {
      setSlugState("checking");
      debounceRef.current = setTimeout(() => checkSlug(sanitized), 400);
    } else {
      setSlugState("idle");
      setSlugMessage(null);
    }
  }

  // A slug conflict can only be caught for certain on submit (e.g. someone
  // else claimed it after the live availability check passed). Fold that
  // into the same inline feedback under the URL field, where the visitor is
  // already looking, instead of leaving it in the generic banner below the
  // description field.
  useEffect(() => {
    if (error && errorField === "slug") {
      setSlugState("taken");
      setSlugMessage(error);
    }
  }, [error, errorField]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (slugState === "taken" || slugState === "invalid" || slug.length < 2) {
      return;
    }
    onSubmit({ slug, description: description.trim() });
  }

  const slugFeedback = (() => {
    if (slugState === "checking") {
      return (
        <span className="flex items-center gap-1 text-xs text-ir-muted">
          <SpinnerIcon className="size-3 animate-spin" />
          Checking…
        </span>
      );
    }
    if (slugState === "available") {
      return (
        <span className="flex items-center gap-1 text-xs text-ir-success">
          <CheckCircleIcon className="size-3" />
          {appHost}/{slug}
        </span>
      );
    }
    if (slugState === "taken" || slugState === "invalid") {
      return (
        <span className="flex items-center gap-1 text-xs text-ir-danger">
          <XCircleIcon className="size-3" />
          {slugMessage}
        </span>
      );
    }
    if (slug) {
      return (
        <span className="text-xs text-ir-muted">
          {appHost}/{slug}
        </span>
      );
    }
    return null;
  })();

  const canSubmit =
    !submitting &&
    slug.length >= 2 &&
    (slugState === "available" || slugState === "idle");

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-center text-2xl font-bold text-ir-heading">
        Almost there
      </h1>
      <p className="mt-1.5 text-center text-sm text-ir-muted">
        Confirm your workspace's address — you can change it later in Settings.
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block" htmlFor="onboarding-slug">
          <span className="mb-1.5 block text-sm font-semibold text-ir-heading">
            Workspace URL
          </span>
          <Input
            autoComplete="off"
            autoFocus
            id="onboarding-slug"
            maxLength={48}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="acme-corp"
            value={slug}
          />
          <div className="mt-1.5 min-h-4">{slugFeedback}</div>
        </label>

        <label className="block" htmlFor="onboarding-description">
          <span className="mb-1.5 block text-sm font-semibold text-ir-heading">
            Description{" "}
            <span className="font-normal text-ir-muted">(optional)</span>
          </span>
          <Textarea
            id="onboarding-description"
            maxLength={300}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does your product do?"
            rows={2}
            value={description}
          />
        </label>

        {error && errorField !== "slug" && (
          <p className="rounded-ir-sm bg-ir-danger/10 p-3 text-sm text-ir-danger">
            {error}
          </p>
        )}

        <p className="text-xs text-ir-muted">
          We'll set up a default feedback board for you. You can invite
          teammates any time from Settings → Members.
        </p>

        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              className="shrink-0"
              disabled={submitting}
              onClick={onBack}
              type="button"
              variant="ghost"
            >
              Back
            </Button>
          )}
          <Button className="flex-1" disabled={!canSubmit} type="submit">
            {submitting ? (
              <span className="flex items-center gap-2">
                <SpinnerIcon className="size-4 animate-spin" />
                Creating workspace…
              </span>
            ) : (
              "Create my workspace"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
