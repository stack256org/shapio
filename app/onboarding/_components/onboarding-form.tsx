"use client";

import { CheckCircle, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  checkSlugAction,
  createWorkspaceAction,
} from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";

interface OnboardingFormProps {
  appHost: string;
  isAdditional?: boolean;
}

type SlugState = "idle" | "checking" | "available" | "taken" | "invalid";

export function OnboardingForm({
  appHost,
  isAdditional = false,
}: OnboardingFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [slugLocked, setSlugLocked] = useState(false);
  const [slugState, setSlugState] = useState<SlugState>("idle");
  const [slugMessage, setSlugMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const slugCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkSlug = useCallback(async (value: string) => {
    if (!value || value.length < 2) {
      setSlugState("idle");
      setSlugMessage(null);
      return;
    }
    setSlugState("checking");
    setSlugMessage(null);
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

  useEffect(() => {
    if (!slugLocked) {
      const generated = slugify(name);
      setSlug(generated);
      if (slugCheckTimeout.current) {
        clearTimeout(slugCheckTimeout.current);
      }
      if (generated.length >= 2) {
        setSlugState("checking");
        slugCheckTimeout.current = setTimeout(() => {
          checkSlug(generated);
        }, 400);
      } else {
        setSlugState("idle");
        setSlugMessage(null);
      }
    }
    return () => {
      if (slugCheckTimeout.current) {
        clearTimeout(slugCheckTimeout.current);
      }
    };
  }, [name, slugLocked, checkSlug]);

  function handleSlugChange(value: string) {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(sanitized);
    setSlugLocked(true);
    if (slugCheckTimeout.current) {
      clearTimeout(slugCheckTimeout.current);
    }
    if (sanitized.length >= 2) {
      setSlugState("checking");
      slugCheckTimeout.current = setTimeout(() => {
        checkSlug(sanitized);
      }, 400);
    } else {
      setSlugState("idle");
      setSlugMessage(null);
    }
  }

  function resetSlugToAuto() {
    setSlugLocked(false);
    const generated = slugify(name);
    setSlug(generated);
    if (generated.length >= 2) {
      checkSlug(generated);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError(null);
    setGeneralError(null);

    if (!name.trim() || name.trim().length < 2) {
      setNameError("Name must be at least 2 characters.");
      return;
    }

    if (slugState === "taken" || slugState === "invalid") {
      return;
    }

    setSubmitting(true);

    const result = await createWorkspaceAction({
      name: name.trim(),
      slug,
      description: description.trim() || undefined,
    });

    if (!result.success) {
      setSubmitting(false);
      if (result.field === "name") {
        setNameError(result.error);
      } else if (result.field === "slug") {
        setSlugState("taken");
        setSlugMessage(result.error);
      } else {
        setGeneralError(result.error);
      }
      return;
    }

    router.push(`/${result.data.slug}`);
  }

  const slugFeedback = (() => {
    if (slugState === "checking") {
      return (
        <span className="flex items-center gap-1 text-xs text-base-content/60">
          <Loader2 className="size-3 animate-spin" />
          Checking…
        </span>
      );
    }
    if (slugState === "available") {
      return (
        <span className="flex items-center gap-1 text-xs text-success-foreground">
          <CheckCircle className="size-3" />
          {appHost}/{slug}
        </span>
      );
    }
    if (slugState === "taken" || slugState === "invalid") {
      return (
        <span className="flex items-center gap-1 text-xs text-error">
          <XCircle className="size-3" />
          {slugMessage}
        </span>
      );
    }
    if (slug) {
      return (
        <span className="text-xs text-base-content/60">
          {appHost}/{slug}
        </span>
      );
    }
    return null;
  })();

  const canSubmit =
    !submitting &&
    name.trim().length >= 2 &&
    slug.length >= 2 &&
    (slugState === "available" || slugState === "idle");

  return (
    <main className="grid min-h-screen place-items-center bg-page px-4 py-4">
      <div className="w-full max-w-lg">
        <Link
          className="mb-5 flex justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          href="/"
        >
          <Logo className="h-16 w-auto" priority />
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>
              {isAdditional
                ? "Create another workspace"
                : "Create your workspace"}
            </CardTitle>
            <CardDescription>
              A workspace is where you collect and manage feedback from your
              users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={onSubmit}>
              {generalError && (
                <p className="bg-error/10 p-3 text-sm text-error">
                  {generalError}
                </p>
              )}

              <div className="space-y-1">
                <label
                  className="block text-sm font-semibold text-base-content"
                  htmlFor="workspace-name"
                >
                  Workspace name
                </label>
                <Input
                  autoComplete="off"
                  autoFocus
                  id="workspace-name"
                  maxLength={64}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError(null);
                  }}
                  placeholder="Acme Corp"
                  required
                  type="text"
                  value={name}
                />
                {nameError && <p className="text-xs text-error">{nameError}</p>}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    className="block text-sm font-semibold text-base-content"
                    htmlFor="workspace-slug"
                  >
                    Workspace URL
                  </label>
                  {slugLocked && (
                    <button
                      className="cursor-pointer rounded-ir-xs text-xs text-base-content/60 underline underline-offset-2 transition-colors duration-150 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                      onClick={resetSlugToAuto}
                      type="button"
                    >
                      Reset to auto
                    </button>
                  )}
                </div>
                <Input
                  autoComplete="off"
                  id="workspace-slug"
                  maxLength={48}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="acme-corp"
                  required
                  type="text"
                  value={slug}
                />
                <div className="min-h-4.5">{slugFeedback}</div>
              </div>

              <div className="space-y-1">
                <label
                  className="block text-sm font-semibold text-base-content"
                  htmlFor="workspace-description"
                >
                  Description{" "}
                  <span className="font-normal text-base-content/60">
                    (optional)
                  </span>
                </label>
                <Textarea
                  id="workspace-description"
                  maxLength={300}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does your product do?"
                  rows={2}
                  value={description}
                />
              </div>

              <Button className="w-full" disabled={!canSubmit} type="submit">
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Creating workspace…
                  </span>
                ) : (
                  "Create workspace"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
