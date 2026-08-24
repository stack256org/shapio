"use client";

import { ImageIcon, PencilIcon, XIcon } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { updatePostAction, uploadPostImageAction } from "@/app/actions/posts";
import { FeedbackBody } from "@/components/posts/feedback-body";
import { Button } from "@/components/ui/button";
import { ImagePreviewThumbnail } from "@/components/ui/image-preview-thumbnail";

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

// Inline editing for the feedback detail page: Title, Description and the Image
// are edited in place (no modal) and saved together through the single existing
// updatePostAction. Status / Category / Assignee stay on their own instant-save
// dropdowns in the header (see StatusSelect / CategorySelect / AssigneeSelect),
// so every field is editable — those three the moment you pick a value, and
// title/description/image when you press Save.

// Title and description edit independently — clicking one must not also flip
// the other into edit mode. The explicit "Edit" control (EditPostControls)
// still opens both at once, sharing the one Save/Cancel bar under the
// description; a title-only edit gets its own compact Save/Cancel instead.
type EditTarget = "body" | "both" | "title" | null;

interface PostEditContextValue {
  bodyEditing: boolean;
  cancel: () => void;
  canEdit: boolean;
  currentImage: string | null;
  draftBody: string;
  draftTitle: string;
  error: string | null;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  imageError: string | null;
  isPending: boolean;
  removeImage: () => void;
  save: () => void;
  setDraftBody: (value: string) => void;
  setDraftTitle: (value: string) => void;
  startEdit: () => void;
  startEditBody: () => void;
  startEditTitle: () => void;
  titleEditing: boolean;
  titleOnlyEditing: boolean;
}

const PostEditContext = createContext<PostEditContextValue | null>(null);

function usePostEdit(): PostEditContextValue {
  const ctx = useContext(PostEditContext);
  if (!ctx) {
    throw new Error("usePostEdit must be used within a PostEditProvider");
  }
  return ctx;
}

interface PostEditProviderProps {
  canEdit: boolean;
  children: ReactNode;
  defaultEditing?: boolean;
  initialBody: string | null;
  initialImageUrl: string | null;
  initialTitle: string;
  postId: string;
  workspaceId: string;
}

export function PostEditProvider({
  postId,
  workspaceId,
  initialTitle,
  initialBody,
  initialImageUrl,
  canEdit,
  defaultEditing = false,
  children,
}: PostEditProviderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editTarget, setEditTarget] = useState<EditTarget>(
    defaultEditing && canEdit ? "both" : null
  );
  const titleEditing = editTarget === "title" || editTarget === "both";
  const bodyEditing = editTarget === "body" || editTarget === "both";
  const titleOnlyEditing = editTarget === "title";
  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const [draftBody, setDraftBody] = useState(initialBody ?? "");
  const [error, setError] = useState<string | null>(null);

  // Image staging: a newly picked file, whether the existing image was removed,
  // and its own validation error.
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // What to show in the image slot right now: the new preview, else the existing
  // image (unless the user removed it).
  const currentImage =
    imagePreviewUrl ?? (imageRemoved ? null : initialImageUrl);

  function resetImage() {
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageRemoved(false);
    setImageError(null);
  }

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
    setImageRemoved(false);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageError(null);
    // If there was a saved image, mark it for removal on save.
    setImageRemoved(true);
  }

  function startEditWith(target: EditTarget) {
    setDraftTitle(initialTitle);
    setDraftBody(initialBody ?? "");
    setError(null);
    resetImage();
    setEditTarget(target);
  }

  function startEdit() {
    startEditWith("both");
  }

  function startEditTitle() {
    startEditWith("title");
  }

  function startEditBody() {
    startEditWith("body");
  }

  function cancel() {
    setError(null);
    resetImage();
    setEditTarget(null);
  }

  function save() {
    // Same validation the old dialog used.
    if (draftTitle.trim().length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }
    setError(null);
    startTransition(async () => {
      // Resolve the image: upload a new file, clear it, or leave it untouched.
      let imageUrl: string | null | undefined;
      if (imageFile) {
        const form = new FormData();
        form.set("image", imageFile);
        const upload = await uploadPostImageAction(form);
        if (!upload.success) {
          setImageError(upload.error);
          return;
        }
        imageUrl = upload.data.url;
      } else if (imageRemoved) {
        imageUrl = null;
      } else {
        imageUrl = undefined;
      }

      const result = await updatePostAction({
        postId,
        workspaceId,
        title: draftTitle.trim(),
        body: draftBody.trim() || undefined,
        imageUrl,
      });
      if (result.success) {
        toast.success("Feedback updated");
        resetImage();
        setEditTarget(null);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to update feedback.");
      }
    });
  }

  return (
    <PostEditContext.Provider
      value={{
        canEdit,
        titleEditing,
        bodyEditing,
        titleOnlyEditing,
        draftTitle,
        draftBody,
        error,
        isPending,
        currentImage,
        imageError,
        setDraftTitle,
        setDraftBody,
        handleImageChange,
        removeImage,
        startEdit,
        startEditTitle,
        startEditBody,
        cancel,
        save,
      }}
    >
      {children}
    </PostEditContext.Provider>
  );
}

// Renders the title as a heading, or a text input when editing. When
// editable, the heading itself is a click (or Enter/Space) target that opens
// edit mode — the explicit Edit button below is still there too, but this is
// the faster path most people reach for first. Clicking the title only ever
// edits the title: the description stays a plain read view until it's
// clicked on its own (see EditablePostContent).
export function EditableTitle({
  title,
  className,
}: {
  className?: string;
  title: string;
}) {
  const {
    titleEditing,
    titleOnlyEditing,
    draftTitle,
    setDraftTitle,
    isPending,
    error,
    canEdit,
    startEditTitle,
    cancel,
    save,
  } = usePostEdit();

  if (!titleEditing) {
    if (!canEdit) {
      return <h1 className={className}>{title}</h1>;
    }
    return (
      <h1 className={className}>
        <button
          className="-mx-1.5 -my-0.5 rounded-ir-sm px-1.5 py-0.5 text-left transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
          onClick={startEditTitle}
          title="Click to edit"
          type="button"
        >
          {title}
        </button>
      </h1>
    );
  }

  // The title-only session (clicked the heading directly) gets its own
  // compact Save/Cancel plus Enter/Escape; the "edit everything" session
  // (explicit Edit button) defers to the shared bar under the description.
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!titleOnlyEditing) {
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  }

  return (
    <div className="space-y-1.5">
      <input
        aria-label="Feedback title"
        autoComplete="off"
        className="w-full rounded-ir-input border border-ir-border bg-ir-surface px-3 py-2 text-lg font-semibold text-ir-heading focus:outline-none focus:ring-2 focus:ring-ir-primary/40 disabled:opacity-50"
        disabled={isPending}
        maxLength={150}
        onChange={(e) => setDraftTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        value={draftTitle}
      />
      {titleOnlyEditing && (
        <>
          {error && <p className="text-xs text-ir-danger">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <Button
              disabled={isPending}
              onClick={cancel}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={isPending || draftTitle.trim().length < 3}
              onClick={save}
              size="sm"
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// View: the description + image. Edit: the rich-text editor, an image
// upload/remove control, and the Save/Cancel bar (the footer of the edit form).
export function EditablePostContent({
  body,
  imageUrl,
  className,
}: {
  body: string | null;
  className?: string;
  imageUrl: string | null;
}) {
  const {
    bodyEditing,
    draftBody,
    setDraftBody,
    isPending,
    error,
    draftTitle,
    currentImage,
    imageError,
    handleImageChange,
    removeImage,
    save,
    cancel,
    canEdit,
    startEditBody,
  } = usePostEdit();

  // The body can contain real links (Quill's link tool), so it can't be
  // wrapped in a <button> — a click anywhere that isn't a link opens edit
  // mode instead, and links keep navigating normally. This only ever opens
  // the description's own edit mode — the title stays a plain heading.
  function handleBodyClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("a")) {
      return;
    }
    startEditBody();
  }

  function handleBodyKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      startEditBody();
    }
  }

  if (!bodyEditing) {
    return (
      <>
        {body ? (
          <div className="mt-6 border-t border-ir-border pt-6">
            {canEdit ? (
              // biome-ignore lint/a11y/useSemanticElements: can't be a <button> — the body renders sanitized rich HTML that may contain real <a> links, which HTML forbids nesting inside a button
              <div
                className="-mx-1.5 -my-1 cursor-pointer rounded-ir-sm px-1.5 py-1 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                onClick={handleBodyClick}
                onKeyDown={handleBodyKeyDown}
                role="button"
                tabIndex={0}
                title="Click to edit"
              >
                <FeedbackBody body={body} className={className} />
              </div>
            ) : (
              <FeedbackBody body={body} className={className} />
            )}
          </div>
        ) : (
          canEdit && (
            <div className="mt-6 border-t border-ir-border pt-6">
              <button
                className="-mx-1.5 rounded-ir-sm px-1.5 py-1 text-left text-sm text-ir-muted italic transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                onClick={startEditBody}
                type="button"
              >
                Add a description…
              </button>
            </div>
          )
        )}
        {imageUrl && (
          <div
            className={body ? "mt-4" : "mt-6 border-t border-ir-border pt-6"}
          >
            <ImagePreviewThumbnail
              className="max-h-96 w-auto rounded-ir-md border border-ir-border object-contain"
              src={imageUrl}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="mt-6 space-y-4 border-t border-ir-border pt-6">
      {/* Description */}
      <div className="space-y-1.5">
        <span className="block text-xs font-medium text-ir-heading">
          Description
        </span>
        <QuillEditor
          disabled={isPending}
          onChange={(html) => setDraftBody(html)}
          placeholder="Add more detail (optional)"
          value={draftBody}
        />
      </div>

      {/* Image */}
      <div className="space-y-1.5">
        <span className="block text-xs font-medium text-ir-heading">
          Image <span className="font-normal text-ir-muted">(optional)</span>
        </span>
        {currentImage ? (
          <div className="relative inline-block">
            <ImagePreviewThumbnail
              className="max-h-48 w-auto rounded-ir-md border border-ir-border object-contain"
              src={currentImage}
            />
            <button
              aria-label="Remove image"
              className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-ir-full border border-ir-border bg-ir-surface text-ir-danger shadow-ir-xs transition-opacity duration-150 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:opacity-50"
              disabled={isPending}
              onClick={removeImage}
              type="button"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        ) : (
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
              type="file"
            />
          </label>
        )}
        {imageError && <p className="text-xs text-ir-danger">{imageError}</p>}
      </div>

      {error && <p className="text-xs text-ir-danger">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Button
          disabled={isPending}
          onClick={cancel}
          size="sm"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          disabled={isPending || draftTitle.trim().length < 3}
          onClick={save}
          size="sm"
        >
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

// The "Edit" affordance shown in the detail actions row (view mode only).
export function EditPostControls() {
  const { canEdit, titleEditing, bodyEditing, startEdit } = usePostEdit();

  if (!canEdit || titleEditing || bodyEditing) {
    return null;
  }

  return (
    <button
      className="flex items-center gap-1.5 text-xs text-ir-primary transition-opacity duration-150 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:opacity-50"
      onClick={startEdit}
      type="button"
    >
      <PencilIcon className="size-3.5" />
      Edit
    </button>
  );
}
