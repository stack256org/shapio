"use client";

import { ImageIcon, XIcon } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createPostAction, uploadPostImageAction } from "@/app/actions/posts";
import { Button } from "@/components/ui/button";
import { ImagePreviewThumbnail } from "@/components/ui/image-preview-thumbnail";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDirtyState } from "@/hooks/use-dirty-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

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

interface WorkspaceStatus {
  isDefault: boolean;
  name: string;
  slug: string;
}

interface NewFeedbackFormProps {
  boardId: string;
  categories: Category[];
  workspaceId: string;
  workspaceSlug: string;
  workspaceStatuses: WorkspaceStatus[];
}

export function NewFeedbackForm({
  boardId,
  categories,
  workspaceId,
  workspaceSlug,
  workspaceStatuses,
}: NewFeedbackFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const defaultCategoryId =
    categories.find((c) => c.isDefault)?.id ?? categories[0]?.id ?? "";
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const defaultStatus =
    workspaceStatuses.find((s) => s.isDefault)?.slug ??
    workspaceStatuses[0]?.slug ??
    "";
  const [status, setStatus] = useState(defaultStatus);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<
    null | "publish" | "draft"
  >(null);

  const { isDirty } = useDirtyState({
    title,
    body,
    categoryId,
    status,
    hasImage: !!imageFile,
  });
  const { guardNavigation } = useUnsavedChangesGuard(isDirty);

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

  function submit(asDraft: boolean) {
    setTitleError(null);

    if (title.trim().length < 3) {
      setTitleError("Title must be at least 3 characters.");
      return;
    }

    setPendingAction(asDraft ? "draft" : "publish");
    startTransition(async () => {
      let imageUrl: string | undefined;

      if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.set("image", imageFile);
        const uploadResult = await uploadPostImageAction(imageFormData);
        if (!uploadResult.success) {
          setImageError(uploadResult.error);
          setPendingAction(null);
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
        status: status || undefined,
        saveAsDraft: asDraft,
      });

      setPendingAction(null);

      if (!result.success) {
        if (result.field === "title") {
          setTitleError(result.error);
        } else {
          toast.error(result.error);
        }
        return;
      }

      toast.success(result.data.isDraft ? "Draft saved" : "Feedback published");
      // Drafts: back to the feedback list so the new draft appears with its
      // badge. Published feedback: jump straight to the post.
      if (result.data.isDraft) {
        router.push(`/${workspaceSlug}/feedback`);
      } else {
        router.push(`/${workspaceSlug}/feedback/${result.data.postId}`);
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
        <div className="border-b border-ir-border p-4 last:border-0">
          <label
            className="mb-1.5 block text-sm font-medium text-ir-heading"
            htmlFor="feedback-title"
          >
            Title <span className="text-ir-danger">*</span>
          </label>
          <input
            autoComplete="off"
            className={`w-full rounded-ir-input border bg-ir-surface px-3 py-2 text-sm text-ir-body placeholder:text-ir-muted focus:outline-none focus:ring-2 focus:ring-ir-primary/40 disabled:opacity-50 ${
              titleError ? "border-ir-danger" : "border-ir-border"
            }`}
            disabled={isPending}
            id="feedback-title"
            maxLength={150}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) {
                setTitleError(null);
              }
            }}
            placeholder="Short, descriptive title"
            type="text"
            value={title}
          />
          {titleError && (
            <p className="mt-1 text-xs text-ir-danger">{titleError}</p>
          )}
        </div>

        <div className="border-b border-ir-border p-4 last:border-0">
          <span className="mb-1.5 block text-sm font-medium text-ir-heading">
            Description{" "}
            <span className="text-xs font-normal text-ir-muted">
              (optional)
            </span>
          </span>
          <QuillEditor
            disabled={isPending}
            onChange={(html) => setBody(html)}
            placeholder="Add more context…"
            value={body}
          />
        </div>

        {workspaceStatuses.length > 0 && (
          <div className="border-b border-ir-border p-4 last:border-0">
            <label
              className="mb-1.5 block text-sm font-medium text-ir-heading"
              htmlFor="feedback-status"
            >
              Status
            </label>
            <Select
              disabled={isPending}
              onValueChange={(v) => setStatus(v)}
              value={status}
            >
              <SelectTrigger className="w-full" id="feedback-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workspaceStatuses.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="border-b border-ir-border p-4 last:border-0">
          <label
            className="mb-1.5 block text-sm font-medium text-ir-heading"
            htmlFor="feedback-category"
          >
            Category <span className="text-ir-danger">*</span>
          </label>
          {categories.length > 0 ? (
            <Select
              disabled={isPending}
              onValueChange={setCategoryId}
              value={categoryId}
            >
              <SelectTrigger className="w-full" id="feedback-category">
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
          ) : (
            <p
              className="rounded-ir-input border border-dashed border-ir-border px-3 py-2 text-sm text-ir-muted"
              id="feedback-category"
            >
              No categories yet —{" "}
              <Link
                className="font-medium text-ir-primary hover:underline"
                href={`/${workspaceSlug}/settings/categories`}
                target="_blank"
              >
                create one
              </Link>{" "}
              to start organizing feedback.
            </p>
          )}
        </div>

        <div className="border-b border-ir-border p-4 last:border-0">
          <span className="mb-1.5 block text-sm font-medium text-ir-heading">
            Image{" "}
            <span className="text-xs font-normal text-ir-muted">
              (optional)
            </span>
          </span>
          <div
            className={`relative flex h-40 w-full items-center justify-center rounded-ir-input ${
              imagePreviewUrl
                ? ""
                : "border border-dashed border-ir-border transition-colors duration-150 ease-ir-standard hover:border-ir-primary/40"
            }`}
          >
            {imagePreviewUrl ? (
              <>
                <ImagePreviewThumbnail
                  className="h-40 w-auto max-w-full rounded-ir-md border border-ir-border object-contain"
                  src={imagePreviewUrl}
                />
                <button
                  aria-label="Remove image"
                  className="absolute -top-2 -right-2 flex size-6 cursor-pointer items-center justify-center rounded-ir-full border border-ir-border bg-ir-surface text-ir-danger shadow-ir-xs transition-opacity duration-150 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                  disabled={isPending}
                  onClick={removeImage}
                  type="button"
                >
                  <XIcon className="size-3.5" />
                </button>
              </>
            ) : (
              <button
                className={`flex h-full w-full cursor-pointer items-center justify-center gap-1.5 text-sm text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading ${
                  isPending ? "pointer-events-none opacity-50" : ""
                }`}
                disabled={isPending}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <ImageIcon className="size-4" />
                Add an image
              </button>
            )}
          </div>
          <input
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            disabled={isPending}
            onChange={handleImageChange}
            ref={fileInputRef}
            type="file"
          />
          {imageError && (
            <p className="mt-1 text-xs text-ir-danger">{imageError}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          disabled={isPending}
          onClick={() =>
            guardNavigation(() => router.push(`/${workspaceSlug}/feedback`))
          }
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          disabled={isPending || title.trim().length < 3}
          onClick={() => submit(true)}
          type="button"
          variant="outline"
        >
          {pendingAction === "draft" ? "Saving…" : "Save as Draft"}
        </Button>
        <Button disabled={isPending || title.trim().length < 3} type="submit">
          {pendingAction === "publish" ? "Publishing…" : "Publish"}
        </Button>
      </div>
    </form>
  );
}
