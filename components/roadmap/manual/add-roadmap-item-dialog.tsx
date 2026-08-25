"use client";

import { ImageIcon, XIcon } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createRoadmapItemAction,
  getRoadmapFeedbackImportAction,
  updateRoadmapItemAction,
  uploadRoadmapCoverImageAction,
} from "@/app/actions/roadmap";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImagePreviewThumbnail } from "@/components/ui/image-preview-thumbnail";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FeedbackSearchPanel,
  prefetchFeedbackSearch,
} from "./feedback-search-panel";
import type { BoardItem } from "./manual-roadmap-card";

// Rich-text editor is client-only (Quill touches the DOM on mount). Reuses the
// same editor as posts/changelog so description formatting is consistent.
const QuillEditor = dynamic(
  () => import("@/components/comments/quill-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 animate-pulse rounded-ir-input border border-ir-border bg-ir-muted-surface" />
    ),
  }
);

const ALLOWED_COVER_TYPES = "image/png,image/jpeg,image/webp,image/gif";
const MAX_COVER_BYTES = 4 * 1024 * 1024;

interface BoardStatus {
  color: string;
  id: string;
  name: string;
}

interface AddRoadmapItemDialogProps {
  defaultStatusId?: string;
  item?: BoardItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  open: boolean;
  statuses: BoardStatus[];
  workspaceId: string;
}

// Convert an ISO/date string to the yyyy-MM-dd a native date input expects.
function toDateInput(iso: string | null | undefined): string {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return d.toISOString().slice(0, 10);
}

const inputClass =
  "w-full rounded-ir-input border border-ir-border bg-ir-surface px-2.5 py-1.5 text-sm text-ir-body placeholder:text-ir-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:opacity-50";

export function AddRoadmapItemDialog({
  open,
  onOpenChange,
  workspaceId,
  statuses,
  defaultStatusId,
  item,
  onSaved,
}: AddRoadmapItemDialogProps) {
  const isEdit = !!item;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [statusId, setStatusId] = useState("");
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isImporting, startImport] = useTransition();
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  // QuillEditor only reads `value` at mount. Bumping this key remounts it so
  // programmatic changes (open/reset and Fill from Feedback) reflect in the
  // editor; plain typing does NOT bump it, so the editor keeps focus/caret.
  const [editorKey, setEditorKey] = useState(0);

  // Warm the Quill chunks and (for the create flow) the default feedback list
  // as soon as this always-mounted dialog component exists, so the very first
  // real open — including the first open after a router.refresh() remounts
  // the board post-save — never pays for either dynamic import or the network
  // round trip. Without this, Radix only renders DialogContent (and its
  // children) once `open` is true, so on every open QuillEditor mounts an
  // empty container, then its own internal `import("quill")` (quill-editor.tsx)
  // resolves and pops the toolbar/content in a beat later — the visible
  // flicker. Preloading both the wrapper and the underlying "quill" package
  // here means that inner import resolves from cache before the user ever
  // sees the empty box.
  useEffect(() => {
    import("@/components/comments/quill-editor");
    import("quill");
    prefetchFeedbackSearch(workspaceId);
  }, [workspaceId]);

  // Reset the form whenever the dialog opens (create) or targets a new item (edit).
  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setCoverError(null);
    if (item) {
      setTitle(item.title);
      setDescription(item.description ?? "");
      setLaunchDate(toDateInput(item.launchDate));
      setCoverImage(item.coverImage ?? "");
      setStatusId(item.statusId);
      setFeedbackId(item.feedbackId);
    } else {
      setTitle("");
      setDescription("");
      setLaunchDate("");
      setCoverImage("");
      setStatusId(defaultStatusId ?? statuses[0]?.id ?? "");
      setFeedbackId(null);
    }
    setEditorKey((k) => k + 1);
  }, [open, item, defaultStatusId, statuses]);

  function handleFill(postId: string) {
    startImport(async () => {
      const res = await getRoadmapFeedbackImportAction({ workspaceId, postId });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      // One-time copy — the item stays independent of later feedback edits.
      setTitle(res.data.title);
      setDescription(res.data.description ?? "");
      setFeedbackId(res.data.id);
      setEditorKey((k) => k + 1);
      toast.success("Filled from feedback");
    });
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setCoverError(null);
    if (file.size > MAX_COVER_BYTES) {
      setCoverError("Image must be 4MB or smaller.");
      return;
    }
    setIsUploadingCover(true);
    try {
      const fd = new FormData();
      fd.set("image", file);
      fd.set("workspaceId", workspaceId);
      const res = await uploadRoadmapCoverImageAction(fd);
      if (!res.success) {
        setCoverError(res.error);
        return;
      }
      setCoverImage(res.data.url);
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  }

  function removeCover() {
    setCoverImage("");
    setCoverError(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title is required.");
      return;
    }
    if (!statusId) {
      setError("Select a column.");
      return;
    }

    startTransition(async () => {
      const payload = {
        workspaceId,
        statusId,
        title: trimmed,
        description: description.trim() || null,
        launchDate: launchDate || null,
        coverImage: coverImage.trim() || null,
      };
      const res = isEdit
        ? await updateRoadmapItemAction({
            ...payload,
            itemId: item!.id,
            feedbackId,
          })
        : await createRoadmapItemAction({ ...payload, feedbackId });
      if (!res.success) {
        setError(res.error);
        return;
      }
      toast.success(isEdit ? "Item updated" : "Roadmap item added");
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[calc(100dvh-3rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <div className="shrink-0 border-b border-ir-border px-5 py-4 pr-14">
          <DialogTitle className="text-base font-semibold">
            {isEdit ? "Edit Roadmap Item" : "Add Roadmap Item"}
          </DialogTitle>
          <DialogDescription className="mt-0.5 text-xs text-ir-muted">
            {isEdit
              ? "Update this roadmap item, optionally filling it from existing feedback."
              : "Create a roadmap item, optionally filling it from existing feedback."}
          </DialogDescription>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_20rem]">
          {/* Left — form (scrolls on its own only if the viewport is short) */}
          <form
            className="min-h-0 space-y-4 overflow-y-auto p-5"
            id="roadmap-item-form"
            onSubmit={handleSubmit}
          >
            <div>
              <label
                className="mb-1 block text-xs font-medium text-ir-heading"
                htmlFor="ri-title"
              >
                Title <span className="text-ir-danger">*</span>
              </label>
              <input
                autoFocus
                className={inputClass}
                id="ri-title"
                maxLength={160}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Dark mode"
                value={title}
              />
            </div>

            <div>
              <span className="mb-1 block text-xs font-medium text-ir-heading">
                Description
              </span>
              <QuillEditor
                key={editorKey}
                minHeight={140}
                onChange={(html) => setDescription(html)}
                placeholder="What is this about?"
                value={description}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-ir-heading"
                  htmlFor="ri-date"
                >
                  Launch Date
                </label>
                <DatePicker
                  id="ri-date"
                  onChange={setLaunchDate}
                  placeholder="No launch date"
                  value={launchDate}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-ir-heading"
                  htmlFor="ri-status"
                >
                  Column
                </label>
                <Select onValueChange={setStatusId} value={statusId}>
                  <SelectTrigger className="w-full" id="ri-status" size="lg">
                    <SelectValue placeholder="Select a column" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <span className="mb-1 block text-xs font-medium text-ir-heading">
                Cover Image{" "}
                <span className="font-normal text-ir-muted">(optional)</span>
              </span>
              {coverImage ? (
                <div className="relative block w-full">
                  <ImagePreviewThumbnail
                    className="max-h-40 w-full rounded-ir-md border border-ir-border bg-ir-muted-surface object-contain"
                    src={coverImage}
                  />
                  <button
                    aria-label="Remove cover image"
                    className="absolute -top-2 -right-2 flex size-6 cursor-pointer items-center justify-center rounded-ir-full border border-ir-border bg-ir-surface text-ir-danger shadow-ir-xs transition-opacity duration-150 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                    onClick={removeCover}
                    type="button"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-ir-input border border-dashed border-ir-border px-3 py-6 text-sm text-ir-muted transition-colors duration-150 ease-ir-standard hover:border-ir-primary/40 hover:text-ir-heading ${
                    isUploadingCover ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <ImageIcon className="size-4" />
                  {isUploadingCover ? "Uploading…" : "Upload a cover image"}
                  <input
                    accept={ALLOWED_COVER_TYPES}
                    className="sr-only"
                    disabled={isUploadingCover}
                    onChange={handleCoverChange}
                    ref={coverInputRef}
                    type="file"
                  />
                </label>
              )}
              {coverError && (
                <p className="mt-1 text-xs text-ir-danger">{coverError}</p>
              )}
            </div>

            {error && <p className="text-xs text-ir-danger">{error}</p>}
          </form>

          {/* Right — feedback search, available for both add and edit (edit
              lets you re-fill an item, or link one that was created without
              feedback, from existing feedback). Only this panel scrolls; the
              modal itself stays fixed-height (the results list has its own
              overflow). */}
          <div className="flex h-64 min-h-0 flex-col overflow-hidden border-t border-ir-border bg-ir-muted-surface md:h-auto md:border-t-0 md:border-l">
            <FeedbackSearchPanel
              onFill={handleFill}
              workspaceId={workspaceId}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-ir-border px-5 py-3">
          <Button
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={isPending || isImporting || isUploadingCover}
            form="roadmap-item-form"
            type="submit"
          >
            {isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
