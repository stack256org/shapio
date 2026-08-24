"use client";

import {
  ArrowLeftIcon,
  CameraIcon,
  CheckCircleIcon,
  ImageIcon,
  XIcon,
} from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPostAction, uploadPostImageAction } from "@/app/actions/posts";
import { EmbedAuthDialog } from "@/components/embed/embed-auth-dialog";
import { PortalVerifyDialog } from "@/components/portal/portal-verify-dialog";
import { Button } from "@/components/ui/button";
import { ImagePreviewThumbnail } from "@/components/ui/image-preview-thumbnail";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { embedFetch } from "@/lib/embed/fetch";
import { useEmbedSignedIn } from "@/lib/embed/use-embed-signed-in";
import { countCharacters } from "@/lib/text-metrics";

const QuillEditor = dynamic(
  () => import("@/components/comments/quill-editor"),
  { ssr: false }
);

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

interface Category {
  color: string;
  id: string;
  isDefault: boolean;
  name: string;
}

interface SimilarPost {
  id: string;
  slug: string;
  title: string;
  upvotes: number;
}

interface Props {
  boardId: string;
  boardName: string;
  boardSlug: string;
  categories: Category[];
  embedQuery?: string;
  isEmbed?: boolean;
  // Widget-modal mode (EmbedWidgetShell): category was already chosen on the
  // preceding Categories screen (undefined only when a workspace has none to
  // choose from), Back/Cancel return to that screen instead of navigating to
  // the board, and the success screen shows "Post More Feedback"/"View Other
  // Feedback" instead of the standalone page's own success actions. Every
  // panel-mode prop is optional and unused by the standalone `/new` page, so
  // its behavior is untouched when they're absent.
  isPanel?: boolean;
  isSignedIn: boolean;
  onBack?: () => void;
  onPostAnother?: () => void;
  panelCategory?: Category;
  // Both widget-only, mirroring isPanel — undefined/absent on the
  // standalone `/new` page, which has no use for either.
  showSimilarPosts?: boolean;
  showViewOtherFeedbackButton?: boolean;
  workspaceId: string;
  workspaceSlug: string;
}

interface Draft {
  body: string;
  categoryId: string;
  title: string;
}

function draftKey(boardId: string) {
  return `ir-draft:${boardId}`;
}

// A visitor's in-progress title/description/category survives an actual
// reload of the widget's iframe via sessionStorage — but a File object
// can't be serialized this way, so an attached image only survives the
// auth-modal interruption (the component stays mounted for that), not a
// real page reload. Wrapped in try/catch since sessionStorage can throw in
// private-browsing or storage-partitioned contexts; the draft just isn't
// recoverable there, no worse than before this existed.
function readDraft(boardId: string): Draft | null {
  try {
    const raw = sessionStorage.getItem(draftKey(boardId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function writeDraft(boardId: string, draft: Draft) {
  try {
    sessionStorage.setItem(draftKey(boardId), JSON.stringify(draft));
  } catch {
    // no-op — see readDraft
  }
}

function clearDraft(boardId: string) {
  try {
    sessionStorage.removeItem(draftKey(boardId));
  } catch {
    // no-op — see readDraft
  }
}

export default function NewPostForm({
  boardId,
  workspaceId,
  workspaceSlug,
  boardSlug,
  boardName,
  categories,
  isEmbed = false,
  isPanel = false,
  embedQuery = "",
  isSignedIn,
  onBack,
  onPostAnother,
  panelCategory,
  showSimilarPosts = false,
  showViewOtherFeedbackButton = false,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const defaultCategoryId =
    panelCategory?.id ??
    categories.find((c) => c.isDefault)?.id ??
    categories[0]?.id ??
    "";
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useEmbedSignedIn(isEmbed, isSignedIn);
  const [authOpen, setAuthOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [similarPosts, setSimilarPosts] = useState<SimilarPost[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const boardHref = `/${workspaceSlug}/b/${boardSlug}${embedQuery}`;
  // Deliberately WITHOUT embedQuery — used only for links that open a new
  // browser tab (View Other Feedback, similar-post suggestions). Carrying
  // embed=1&layout=panel into a real, standalone browser tab would render
  // that tab in the narrow widget-panel chrome instead of the full Public
  // Portal it's supposed to be.
  const publicBoardHref = `/${workspaceSlug}/b/${boardSlug}`;

  // Recover a draft left behind by an actual reload — the auth-modal
  // interruption never unmounts this component in the first place, so it
  // doesn't need this; this is specifically for "closed the tab / refreshed
  // mid-fill" recovery.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only restore
  useEffect(() => {
    const draft = readDraft(boardId);
    if (draft) {
      setTitle(draft.title);
      setBody(draft.body);
      setCategoryId(draft.categoryId);
    }
  }, []);

  useEffect(() => {
    if (title || body || (categoryId && categoryId !== defaultCategoryId)) {
      writeDraft(boardId, { title, body, categoryId });
    }
  }, [boardId, title, body, categoryId, defaultCategoryId]);

  // "Similar posts while typing" — a duplicate-detection nudge, gated by the
  // workspace's Widget Settings toggle. Searches the same public board
  // listing an anonymous visitor could already browse directly, so this
  // hits an unauthenticated endpoint.
  useEffect(() => {
    if (!isPanel || !showSimilarPosts) {
      return;
    }
    const trimmed = title.trim();
    if (countCharacters(trimmed) < 3) {
      setSimilarPosts([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const res = await embedFetch(
          `/api/embed/posts/search?boardId=${encodeURIComponent(boardId)}&q=${encodeURIComponent(trimmed)}`
        );
        if (cancelled || !res.ok) {
          return;
        }
        const data = await res.json();
        setSimilarPosts(data.posts ?? []);
      } catch {
        // Best-effort suggestion — a failed lookup just shows nothing.
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [boardId, isPanel, showSimilarPosts, title]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setImageError(null);
    if (!file) {
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setImageError("Use a PNG, JPEG, WEBP, or GIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Image must be 4MB or smaller.");
      return;
    }
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Inside the embed, mutations go through embedFetch to the bearer-
  // authenticated /api/embed/* routes instead of these Server Actions,
  // since a Server Action invocation can't carry an Authorization header
  // (see the implementation plan). Outside the embed this is byte-for-byte
  // the same createPostAction/uploadPostImageAction flow as before —
  // nothing about the direct Public Portal path changes.
  async function doSubmitEmbed() {
    let imageUrl: string | undefined;

    if (imageFile) {
      const imageFormData = new FormData();
      imageFormData.set("image", imageFile);
      const uploadRes = await embedFetch("/api/embed/posts/upload-image", {
        method: "POST",
        body: imageFormData,
      });
      if (uploadRes.status === 401) {
        setSignedIn(false);
        setAuthOpen(true);
        return;
      }
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => null);
        setImageError(data?.error ?? "Something went wrong.");
        return;
      }
      imageUrl = (await uploadRes.json()).url;
    }

    const postRes = await embedFetch("/api/embed/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId,
        workspaceId,
        title: title.trim(),
        body: body.trim() || undefined,
        categoryId: categoryId || undefined,
        imageUrl,
      }),
    });

    if (postRes.status === 401) {
      setSignedIn(false);
      setAuthOpen(true);
      return;
    }
    if (!postRes.ok) {
      const data = await postRes.json().catch(() => null);
      if (data?.field === "title") {
        setTitleError(data.error);
      } else {
        setGeneralError(data?.error ?? "Something went wrong.");
      }
      return;
    }

    clearDraft(boardId);
    setSubmitted(true);
  }

  async function doSubmit() {
    if (isEmbed) {
      await doSubmitEmbed();
      return;
    }

    let imageUrl: string | undefined;

    if (imageFile) {
      const imageFormData = new FormData();
      imageFormData.set("image", imageFile);
      const uploadResult = await uploadPostImageAction(imageFormData);
      if (!uploadResult.success) {
        setImageError(uploadResult.error);
        return;
      }
      imageUrl = uploadResult.data.url;
    }

    const result = await createPostAction({
      boardId,
      workspaceId,
      title: title.trim(),
      body: body.trim() || undefined,
      categoryId: categoryId || undefined,
      imageUrl,
    });

    if (!result.success) {
      // The verification cookie can lapse between page load and submit (30-day
      // expiry, or "Not you?" in another tab). Reopen the prompt instead of
      // stranding the visitor behind an error — the draft is still on screen
      // and resubmits itself once they verify again.
      if (result.code === "UNAUTHENTICATED") {
        setSignedIn(false);
        setAuthOpen(true);
        return;
      }
      if (result.field === "title") {
        setTitleError(result.error);
      } else {
        setGeneralError(result.error);
      }
      return;
    }

    clearDraft(boardId);

    router.push(
      `/${workspaceSlug}/b/${boardSlug}/p/${result.data.postSlug}${embedQuery}`
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTitleError(null);
    setCategoryError(null);
    setGeneralError(null);

    if (countCharacters(title) < 3) {
      setTitleError("Title must be at least 3 characters.");
      return;
    }

    if (categories.length > 0 && !categoryId) {
      setCategoryError("Choose a category.");
      return;
    }

    // Gate before touching the image upload at all, so a pre-auth attempt
    // never uploads anything — the resubmit after auth uploads exactly once.
    // Both surfaces resolve identity in place: account sign-in inside the
    // embed, accountless email verification on the Public Portal. The typed
    // draft stays mounted throughout, so nothing is lost either way.
    if (!signedIn) {
      setAuthOpen(true);
      return;
    }

    startTransition(doSubmit);
  }

  function handleAuthenticated() {
    setSignedIn(true);
    startTransition(doSubmit);
  }

  function handleSubmitAnother() {
    setSubmitted(false);
    setTitle("");
    setBody("");
    setCategoryId(defaultCategoryId);
    removeImage();
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 px-8 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-ir-full bg-ir-success/10">
          <CheckCircleIcon className="size-6 text-ir-success" weight="fill" />
        </div>
        {isPanel ? (
          <>
            <div>
              <h1 className="text-lg font-semibold text-ir-heading">
                Feedback successfully created
              </h1>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button onClick={onPostAnother ?? handleSubmitAnother}>
                Post More Feedback
              </Button>
              {showViewOtherFeedbackButton && (
                <Button asChild variant="ghost">
                  <a
                    href={publicBoardHref}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View Other Feedback
                  </a>
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-lg font-semibold text-ir-heading">
                Feedback submitted
              </h1>
              <p className="mt-1 text-sm text-ir-muted">
                Thanks — your idea is on its way to the team.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => router.push(boardHref)} variant="outline">
                Back to Feedback
              </Button>
              <Button onClick={handleSubmitAnother}>Submit another</Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Back nav — hidden in embed mode (no navigation chrome) */}
      {!isEmbed && (
        <div className="border-b border-ir-border px-8 py-4">
          <Link
            className="inline-flex items-center gap-1.5 text-sm text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
            href={boardHref}
          >
            <ArrowLeftIcon className="size-4" />
            {boardName}
          </Link>
        </div>
      )}

      <div className={isPanel ? "px-4 py-4" : "px-8 py-8"}>
        {!isPanel && (
          <h1 className="mb-6 text-xl font-semibold text-ir-heading">
            Submit feedback
          </h1>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Title */}
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-ir-heading"
              htmlFor="post-title"
            >
              Title <span className="text-ir-danger">*</span>
            </label>
            <input
              autoComplete="off"
              className={`w-full rounded-ir-input border bg-ir-surface px-3 py-2.5 text-sm text-ir-body placeholder:text-ir-muted focus:outline-none focus:ring-2 focus:ring-ir-primary/40 disabled:opacity-50 ${
                titleError ? "border-ir-danger" : "border-ir-border"
              }`}
              disabled={isPending}
              id="post-title"
              maxLength={150}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) {
                  setTitleError(null);
                }
              }}
              placeholder="Short, descriptive title for your idea or request"
              required
              type="text"
              value={title}
            />
            <div className="mt-1 flex items-start justify-between">
              {titleError ? (
                <p className="text-xs text-ir-danger">{titleError}</p>
              ) : (
                <span />
              )}
              <span className="ml-2 shrink-0 text-xs text-ir-muted">
                {countCharacters(title)}/150
              </span>
            </div>

            {/* Similar posts while typing — opens in a new tab rather than
                navigating the widget itself, since the widget is a
                creation-only surface, never a browsing one. */}
            {isPanel && similarPosts.length > 0 && (
              <div className="mt-2 space-y-1.5 rounded-ir-md border border-ir-border bg-ir-muted-surface p-2">
                <p className="px-1 text-2xs font-medium tracking-wide text-ir-muted uppercase">
                  Similar feedback already exists
                </p>
                {similarPosts.map((post) => (
                  <a
                    className="flex items-center gap-2 rounded-ir-sm px-1.5 py-1 text-xs text-ir-body transition-colors duration-150 ease-ir-standard hover:bg-ir-surface hover:text-ir-primary"
                    href={`${publicBoardHref}/p/${post.slug}`}
                    key={post.id}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <span className="shrink-0 text-ir-muted">
                      ↑ {post.upvotes}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {post.title}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Body */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ir-heading">
              Description{" "}
              <span className="text-xs font-normal text-ir-muted">
                (optional)
              </span>
            </span>
            <QuillEditor
              ariaLabel="Feedback description"
              disabled={isPending}
              minHeight={120}
              onChange={(html) => setBody(html)}
              placeholder="Add more context — what problem does this solve? What would the ideal solution look like?"
              value={body}
            />
          </div>

          {/* Category — chosen on the preceding Categories screen in panel
              mode, so there's nothing left to pick here. */}
          {!isPanel && categories.length > 0 && (
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-ir-heading"
                htmlFor="post-category"
              >
                Category <span className="text-ir-danger">*</span>
              </label>
              <Select
                disabled={isPending}
                onValueChange={(v) => {
                  setCategoryId(v);
                  if (categoryError) {
                    setCategoryError(null);
                  }
                }}
                value={categoryId}
              >
                <SelectTrigger
                  aria-invalid={!!categoryError}
                  className="w-full"
                  id="post-category"
                >
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryError && (
                <p className="mt-1 text-xs text-ir-danger">{categoryError}</p>
              )}
            </div>
          )}

          {/* Image (optional) */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ir-heading">
              Image{" "}
              <span className="text-xs font-normal text-ir-muted">
                (optional)
              </span>
            </span>
            {imagePreviewUrl ? (
              <div className="relative inline-block">
                <ImagePreviewThumbnail
                  className="max-h-48 w-auto rounded-ir-sm border border-ir-border object-contain"
                  src={imagePreviewUrl}
                />
                <button
                  aria-label="Remove image"
                  className="absolute -top-2 -right-2 flex size-6 cursor-pointer items-center justify-center rounded-ir-full border border-ir-border bg-ir-surface text-ir-danger shadow-ir-sm transition-opacity duration-150 ease-ir-standard hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                  disabled={isPending}
                  onClick={removeImage}
                  type="button"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className={isPanel ? "flex gap-2.5" : ""}>
                <label
                  className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-ir-input border border-dashed border-ir-border px-3 py-4 text-sm text-ir-muted transition-colors duration-150 ease-ir-standard hover:border-ir-primary/40 hover:text-ir-heading ${
                    isPending ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <ImageIcon className="size-4" />
                  Add an image
                  <input
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="sr-only"
                    disabled={isPending}
                    onChange={handleImageChange}
                    ref={fileInputRef}
                    type="file"
                  />
                </label>
                {isPanel && (
                  <button
                    className="flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-ir-input border border-dashed border-ir-border px-3 py-4 text-sm text-ir-muted opacity-60"
                    disabled
                    title="Coming soon"
                    type="button"
                  >
                    <CameraIcon className="size-4" />
                    Take a screenshot
                  </button>
                )}
              </div>
            )}
            {imageError && (
              <p className="mt-1 text-xs text-ir-danger">{imageError}</p>
            )}
          </div>

          {generalError && (
            <p className="text-sm text-ir-danger">{generalError}</p>
          )}

          {/* Actions — pinned to the bottom-right of the form */}
          <div className="flex items-center justify-end gap-3 border-t border-ir-border pt-5">
            {onBack ? (
              <button
                className="rounded-ir-sm px-3 py-2.5 text-sm text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                onClick={onBack}
                type="button"
              >
                Cancel
              </button>
            ) : (
              <Link
                className="rounded-ir-sm px-3 py-2.5 text-sm text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                href={boardHref}
              >
                Cancel
              </Link>
            )}
            <Button
              disabled={isPending || countCharacters(title) < 3}
              type="submit"
            >
              {isPending ? "Submitting…" : "Submit feedback"}
            </Button>
          </div>
        </form>
      </div>

      {isEmbed ? (
        <EmbedAuthDialog
          onAuthenticated={handleAuthenticated}
          onOpenChange={setAuthOpen}
          open={authOpen}
        />
      ) : (
        <PortalVerifyDialog
          action="post"
          onOpenChange={setAuthOpen}
          onVerified={handleAuthenticated}
          open={authOpen}
        />
      )}
    </div>
  );
}
