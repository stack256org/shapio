"use client";

import {
  PencilIcon,
  PlusIcon,
  SpinnerIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  createChangelogEntryAction,
  createChangelogLabelAction,
  deleteChangelogLabelAction,
  publishChangelogEntryAction,
  updateChangelogEntryAction,
  updateChangelogLabelAction,
  uploadChangelogCoverImageAction,
} from "@/app/actions/changelog";
import { ChangelogLabelBadge } from "@/components/changelog/changelog-label-badge";
import { LinkedPostsSelector } from "@/components/changelog/linked-posts-selector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImagePreviewThumbnail } from "@/components/ui/image-preview-thumbnail";
import { ContentContainer } from "@/components/ui/page";
import { SetPageHeader } from "@/components/workspace/topbar";
import { useDirtyState } from "@/hooks/use-dirty-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
  CHANGELOG_LABEL_VALUES,
  getLabelInfo,
} from "@/lib/changelog/constants";
import { countCharacters } from "@/lib/text-metrics";

// Arrays aren't reference-comparable, so dirty-tracking compares a stable,
// order-independent string form of the linked-post id list instead.
function linkedPostsKey(posts: LinkedPost[]): string {
  return posts
    .map((p) => p.id)
    .sort()
    .join(",");
}

const QuillEditor = dynamic(
  () => import("@/components/comments/quill-editor"),
  {
    ssr: false,
  }
);

const MAX_COVER_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_COVER_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

interface LinkedPost {
  boardName: string;
  boardSlug: string;
  id: string;
  mergedIntoId?: string | null;
  mergedIntoTitle?: string | null;
  slug: string;
  status: string;
  title: string;
  upvotes: number;
}

interface ChangelogLabel {
  color: string;
  id: string;
  name: string;
}

interface ChangelogEditorProps {
  initialEntry?: {
    id: string;
    title: string;
    body: string;
    coverImageUrl: string | null;
    label: string;
    isPublished: boolean;
    linkedPosts: LinkedPost[];
  };
  // Persisted custom labels for this workspace (built-ins excluded). Managed
  // (create/rename/delete) inline from the label section below.
  initialLabels?: ChangelogLabel[];
  // Passed through to the page header (title/description/back-link/portal
  // button) — the page's SetPageHeader call lives here, not in page.tsx,
  // because the back-link needs to be guarded against this component's own
  // dirty state (see useUnsavedChangesGuard below).
  pageDescription?: string;
  pageTitle: string;
  portalHref?: string | null;
  workspaceId: string;
  workspaceSlug: string;
}

export function ChangelogEditor({
  workspaceId,
  workspaceSlug,
  initialEntry,
  initialLabels = [],
  pageTitle,
  pageDescription,
  portalHref,
}: ChangelogEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [entryId, setEntryId] = useState<string | null>(
    initialEntry?.id ?? null
  );
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [body, setBody] = useState(initialEntry?.body ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    initialEntry?.coverImageUrl ?? null
  );
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [isCoverDragActive, setIsCoverDragActive] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  // Dragenter/dragleave fire on every child the pointer crosses, so a leave
  // over an inner element (icon, text) would otherwise flicker the active
  // state off before the drop zone is actually exited. Counting enter/leave
  // pairs keeps the active state on until the outermost element is left.
  const coverDragDepthRef = useRef(0);
  const [label, setLabel] = useState(initialEntry?.label ?? "new_feature");
  const [newLabel, setNewLabel] = useState("");
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  // Persisted custom labels (workspace-scoped). Created from the "+" modal;
  // renamed/deleted inline on their chip below.
  const [labels, setLabels] = useState<ChangelogLabel[]>(initialLabels);
  const [labelBusy, setLabelBusy] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelName, setEditingLabelName] = useState("");
  const [linkedPosts, setLinkedPosts] = useState<LinkedPost[]>(
    initialEntry?.linkedPosts ?? []
  );

  // The selected label may be a custom one whose row was deleted; surface it as
  // a read-only chip so the current selection stays visible.
  const orphanLabel = useMemo(() => {
    const isBuiltin = (CHANGELOG_LABEL_VALUES as readonly string[]).includes(
      label
    );
    const isCustom = labels.some((l) => l.name === label);
    return !isBuiltin && !isCustom && label ? label : null;
  }, [label, labels]);

  // Create (or select, if it already exists) a label from the input. Matching is
  // case-insensitive against built-in names/keys and existing custom labels, so
  // duplicates are never created. New custom labels are persisted immediately so
  // they survive a refresh.
  async function addCustomLabel() {
    const raw = newLabel.trim();
    if (!raw || labelBusy) {
      return;
    }
    const lower = raw.toLowerCase();
    const builtinMatch = CHANGELOG_LABEL_VALUES.find(
      (l) =>
        l.toLowerCase() === lower ||
        getLabelInfo(l).label.toLowerCase() === lower
    );
    if (builtinMatch) {
      setLabel(builtinMatch);
      setNewLabel("");
      setLabelModalOpen(false);
      return;
    }
    const existing = labels.find((l) => l.name.toLowerCase() === lower);
    if (existing) {
      setLabel(existing.name);
      setNewLabel("");
      setLabelModalOpen(false);
      return;
    }
    setLabelBusy(true);
    const res = await createChangelogLabelAction({ workspaceId, name: raw });
    setLabelBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setLabels((prev) => [...prev, res.data]);
    setLabel(res.data.name);
    setNewLabel("");
    setLabelModalOpen(false);
  }

  function handleLabelModalOpenChange(open: boolean) {
    setLabelModalOpen(open);
    if (!open) {
      setNewLabel("");
    }
  }

  async function renameLabel(id: string) {
    const original = labels.find((l) => l.id === id);
    const name = editingLabelName.trim();
    if (!original || !name || name === original.name) {
      setEditingLabelId(null);
      return;
    }
    setLabelBusy(true);
    const res = await updateChangelogLabelAction({
      labelId: id,
      workspaceId,
      name,
    });
    setLabelBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setLabels((prev) => prev.map((l) => (l.id === id ? res.data : l)));
    // Keep the entry's selection pointing at the renamed label.
    if (label === original.name) {
      setLabel(res.data.name);
    }
    setEditingLabelId(null);
  }

  async function removeLabel(id: string, name: string) {
    if (labelBusy) {
      return;
    }
    setLabelBusy(true);
    const res = await deleteChangelogLabelAction({ labelId: id, workspaceId });
    setLabelBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setLabels((prev) => prev.filter((l) => l.id !== id));
    // If the deleted label was selected, fall back to the default built-in.
    if (label === name) {
      setLabel("new_feature");
    }
    toast.success("Label deleted");
  }
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const isPublished = initialEntry?.isPublished ?? false;

  // Save Draft/Update should stay disabled until something actually changed
  // since the last time this content was persisted — whether that save was a
  // manual click or the debounced auto-save below. Publish is a separate,
  // deliberately excluded case: it's a state transition (draft -> live), not
  // a "did the content change" save, so it stays available whenever the
  // title is present, same as before.
  const { isDirty, markClean } = useDirtyState({
    title,
    body,
    coverImageUrl,
    label,
    linkedPosts: linkedPostsKey(linkedPosts),
  });

  const { guardNavigation } = useUnsavedChangesGuard(isDirty);

  // Auto-save: debounced, fires after 30s of idle
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAutoSave = useRef(false);

  const doAutoSave = useCallback(async () => {
    if (!title.trim()) {
      return;
    }
    setSaveStatus("saving");
    try {
      if (entryId) {
        await updateChangelogEntryAction({
          entryId,
          workspaceId,
          title: title.trim(),
          body,
          coverImageUrl,
          label,
          postIds: linkedPosts.map((p) => p.id),
        });
      } else {
        const result = await createChangelogEntryAction({
          workspaceId,
          title: title.trim(),
          body,
          coverImageUrl: coverImageUrl ?? undefined,
          label,
          postIds: linkedPosts.map((p) => p.id),
        });
        if (result.success) {
          setEntryId(result.data.id);
        }
      }
      markClean({
        title,
        body,
        coverImageUrl,
        label,
        linkedPosts: linkedPostsKey(linkedPosts),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }, [
    entryId,
    workspaceId,
    title,
    body,
    coverImageUrl,
    label,
    linkedPosts,
    markClean,
  ]);

  // Schedule auto-save whenever content changes
  useEffect(() => {
    if (!title.trim()) {
      return;
    }
    pendingAutoSave.current = true;
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
    }
    autoSaveRef.current = setTimeout(() => {
      if (pendingAutoSave.current) {
        pendingAutoSave.current = false;
        doAutoSave();
      }
    }, 30_000);
    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [title, doAutoSave]);

  async function uploadCoverFile(file: File) {
    setCoverError(null);
    if (!ALLOWED_COVER_IMAGE_TYPES.has(file.type)) {
      setCoverError("Use a PNG, JPEG, WEBP, or GIF image.");
      return;
    }
    if (file.size > MAX_COVER_IMAGE_BYTES) {
      setCoverError("Image must be 4MB or smaller.");
      return;
    }

    setIsUploadingCover(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.set("image", file);
      uploadFormData.set("workspaceId", workspaceId);
      const result = await uploadChangelogCoverImageAction(uploadFormData);
      if (!result.success) {
        setCoverError(result.error);
        return;
      }
      setCoverImageUrl(result.data.url);
    } finally {
      setIsUploadingCover(false);
    }
  }

  function handleCoverImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    uploadCoverFile(file);
  }

  function handleCoverDragEnter(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    if (isUploadingCover) {
      return;
    }
    coverDragDepthRef.current += 1;
    setIsCoverDragActive(true);
  }

  function handleCoverDragOver(e: React.DragEvent<HTMLLabelElement>) {
    // Required for onDrop to fire at all — browsers otherwise treat the
    // dragover target as "not a valid drop target" and reject the drop.
    e.preventDefault();
  }

  function handleCoverDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    coverDragDepthRef.current = Math.max(0, coverDragDepthRef.current - 1);
    if (coverDragDepthRef.current === 0) {
      setIsCoverDragActive(false);
    }
  }

  function handleCoverDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    coverDragDepthRef.current = 0;
    setIsCoverDragActive(false);
    if (isUploadingCover) {
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadCoverFile(file);
    }
  }

  function removeCoverImage() {
    setCoverImageUrl(null);
    setCoverError(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
  }

  function handleSaveDraft() {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    startTransition(async () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
      if (entryId) {
        const result = await updateChangelogEntryAction({
          entryId,
          workspaceId,
          title: title.trim(),
          body,
          coverImageUrl,
          label,
          postIds: linkedPosts.map((p) => p.id),
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Draft saved");
        markClean({
          title,
          body,
          coverImageUrl,
          label,
          linkedPosts: linkedPostsKey(linkedPosts),
        });
        router.push(`/${workspaceSlug}/settings/changelog`);
      } else {
        const result = await createChangelogEntryAction({
          workspaceId,
          title: title.trim(),
          body,
          coverImageUrl: coverImageUrl ?? undefined,
          label,
          postIds: linkedPosts.map((p) => p.id),
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Draft saved");
        markClean({
          title,
          body,
          coverImageUrl,
          label,
          linkedPosts: linkedPostsKey(linkedPosts),
        });
        router.push(`/${workspaceSlug}/settings/changelog`);
      }
    });
  }

  function handlePublish() {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    startTransition(async () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }

      let id = entryId;
      if (id) {
        const result = await updateChangelogEntryAction({
          entryId: id,
          workspaceId,
          title: title.trim(),
          body,
          coverImageUrl,
          label,
          postIds: linkedPosts.map((p) => p.id),
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
      } else {
        const result = await createChangelogEntryAction({
          workspaceId,
          title: title.trim(),
          body,
          coverImageUrl: coverImageUrl ?? undefined,
          label,
          postIds: linkedPosts.map((p) => p.id),
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        id = result.data.id;
        setEntryId(id);
      }
      markClean({
        title,
        body,
        coverImageUrl,
        label,
        linkedPosts: linkedPostsKey(linkedPosts),
      });

      const publishResult = await publishChangelogEntryAction({
        entryId: id,
        workspaceId,
      });
      if (!publishResult.success) {
        toast.error(publishResult.error);
        return;
      }

      toast.success("Entry published");
      router.push(`/${workspaceSlug}/settings/changelog`);
    });
  }

  function handleUpdate() {
    if (!entryId || !title.trim()) {
      return;
    }
    startTransition(async () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
      const result = await updateChangelogEntryAction({
        entryId,
        workspaceId,
        title: title.trim(),
        body,
        coverImageUrl,
        label,
        postIds: linkedPosts.map((p) => p.id),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Entry updated");
      markClean({
        title,
        body,
        coverImageUrl,
        label,
        linkedPosts: linkedPostsKey(linkedPosts),
      });
      router.push(`/${workspaceSlug}/settings/changelog`);
    });
  }

  return (
    <>
      <SetPageHeader
        backHref={`/${workspaceSlug}/settings/changelog`}
        description={pageDescription}
        onBeforeBack={guardNavigation}
        portalHref={portalHref}
        title={pageTitle}
      />
      <ContentContainer>
        <div className="flex flex-col gap-6 rounded-ir-card border border-ir-border bg-ir-surface p-6 shadow-ir-xs sm:p-8">
          {/* Cover image — first, so it can be chosen before the details */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-ir-heading">
              Cover image
              <span className="ml-1 font-normal normal-case text-ir-muted">
                (optional)
              </span>
            </span>
            {coverImageUrl ? (
              <div className="group relative block w-full overflow-hidden rounded-ir-lg border border-ir-border bg-ir-muted-surface">
                <ImagePreviewThumbnail
                  alt="Cover image"
                  className="h-[220px] w-full animate-in fade-in-0 rounded-ir-lg object-cover duration-300 ease-ir-standard sm:h-[240px]"
                  key={coverImageUrl}
                  src={coverImageUrl}
                />
                <button
                  aria-label="Remove cover image"
                  className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-ir-full border border-ir-border bg-ir-surface text-ir-muted shadow-ir-md transition-colors duration-150 ease-ir-standard hover:border-ir-danger hover:bg-ir-danger hover:text-ir-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                  onClick={removeCoverImage}
                  type="button"
                >
                  <XIcon className="size-4" weight="bold" />
                </button>
              </div>
            ) : (
              // biome-ignore lint/a11y/noNoninteractiveElementInteractions: label wraps the hidden file input to power drag-and-drop upload onto the click target
              <label
                className={`group flex w-full flex-col items-center justify-center gap-3 rounded-ir-input border border-dashed px-4 py-12 text-center transition-all duration-200 ease-ir-standard has-[:focus-visible]:border-ir-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ir-primary/40 ${
                  isUploadingCover
                    ? "cursor-default border-ir-border bg-ir-muted-surface/40"
                    : isCoverDragActive
                      ? "cursor-pointer border-ir-primary bg-ir-primary/5 shadow-ir-sm"
                      : "cursor-pointer border-ir-border bg-ir-muted-surface/40 hover:border-ir-primary/50 hover:bg-ir-primary/5"
                }`}
                onDragEnter={handleCoverDragEnter}
                onDragLeave={handleCoverDragLeave}
                onDragOver={handleCoverDragOver}
                onDrop={handleCoverDrop}
              >
                <span
                  className={`flex size-11 items-center justify-center rounded-ir-full bg-ir-primary/10 text-ir-primary transition-transform duration-200 ease-ir-standard ${
                    isCoverDragActive ? "scale-110" : "group-hover:scale-110"
                  }`}
                >
                  {isUploadingCover ? (
                    <SpinnerIcon className="size-5 animate-spin" />
                  ) : (
                    <UploadSimpleIcon className="size-5" weight="bold" />
                  )}
                </span>
                <span className="space-y-1">
                  <span className="block text-sm font-medium text-ir-heading">
                    {isUploadingCover
                      ? "Uploading…"
                      : "Drag & drop an image here or click to browse"}
                  </span>
                  {!isUploadingCover && (
                    <span className="block text-xs text-ir-muted">
                      PNG, JPEG, WEBP, or GIF • Max 4MB
                    </span>
                  )}
                </span>
                <input
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  disabled={isUploadingCover}
                  onChange={handleCoverImageChange}
                  ref={coverInputRef}
                  type="file"
                />
              </label>
            )}
            {coverError && (
              <p className="text-xs text-ir-danger">{coverError}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold uppercase tracking-wide text-ir-heading"
              htmlFor="title"
            >
              Title
            </label>
            <div className="relative">
              <input
                className="w-full rounded-ir-input border border-ir-border bg-ir-surface px-3 py-2.5 pr-16 text-sm text-ir-body placeholder:text-ir-muted focus:ring-2 focus:ring-ir-primary/40 focus:outline-none"
                id="title"
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What shipped?"
                type="text"
                value={title}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ir-muted tabular-nums">
                {countCharacters(title)}/200
              </span>
            </div>
          </div>

          {/* Content — immediately after the title */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-ir-heading">
              Content
            </span>
            <QuillEditor
              minHeight={240}
              onChange={(html) => setBody(html)}
              placeholder="What shipped in this update?"
              value={body}
            />
          </div>

          {/* Label — built-in labels, custom label chips, and an "Add label" modal */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-ir-heading">
              Label
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {/* Built-in labels — always available, not editable. */}
              {CHANGELOG_LABEL_VALUES.map((l) => {
                const info = getLabelInfo(l);
                const isActive = label === l;
                return (
                  <button
                    className={`cursor-pointer rounded-ir-sm border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ease-ir-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 ${
                      isActive
                        ? "border-current"
                        : "border-ir-border text-ir-muted hover:border-ir-primary/30"
                    }`}
                    key={l}
                    onClick={() => setLabel(l)}
                    style={
                      isActive
                        ? {
                            color: info.color,
                            backgroundColor: `${info.color}12`,
                            borderColor: `${info.color}60`,
                          }
                        : {}
                    }
                    type="button"
                  >
                    {info.label}
                  </button>
                );
              })}

              {/* Custom labels — selectable, with inline rename + delete. */}
              {labels.map((l) => {
                const isActive = label === l.name;
                if (editingLabelId === l.id) {
                  return (
                    <input
                      aria-label={`Rename ${l.name}`}
                      autoFocus
                      className="rounded-ir-sm border border-ir-primary bg-ir-surface px-2 py-1.5 text-xs text-ir-body focus:ring-2 focus:ring-ir-primary/40 focus:outline-none"
                      key={l.id}
                      maxLength={40}
                      onBlur={() => renameLabel(l.id)}
                      onChange={(e) => setEditingLabelName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          renameLabel(l.id);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingLabelId(null);
                        }
                      }}
                      value={editingLabelName}
                    />
                  );
                }
                return (
                  <span
                    className={`inline-flex items-center gap-1 rounded-ir-sm border py-1.5 pr-1.5 pl-3 text-xs font-semibold transition-all duration-150 ease-ir-standard ${
                      isActive
                        ? "border-current"
                        : "border-ir-border text-ir-muted hover:border-ir-primary/30"
                    }`}
                    key={l.id}
                    style={
                      isActive
                        ? {
                            color: l.color,
                            backgroundColor: `${l.color}12`,
                            borderColor: `${l.color}60`,
                          }
                        : {}
                    }
                  >
                    <button
                      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                      onClick={() => setLabel(l.name)}
                      type="button"
                    >
                      {l.name}
                    </button>
                    <button
                      aria-label={`Rename ${l.name}`}
                      className="cursor-pointer text-ir-muted hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:opacity-50"
                      disabled={labelBusy}
                      onClick={() => {
                        setEditingLabelId(l.id);
                        setEditingLabelName(l.name);
                      }}
                      type="button"
                    >
                      <PencilIcon className="size-3" />
                    </button>
                    <button
                      aria-label={`Delete ${l.name}`}
                      className="cursor-pointer text-ir-muted hover:text-ir-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:opacity-50"
                      disabled={labelBusy}
                      onClick={() => removeLabel(l.id, l.name)}
                      type="button"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </span>
                );
              })}

              {/* The selected label whose row was deleted — read-only. */}
              {orphanLabel && (
                <span
                  className="rounded-ir-sm border border-current px-3 py-1.5 text-xs font-semibold"
                  style={{
                    color: getLabelInfo(orphanLabel).color,
                    backgroundColor: `${getLabelInfo(orphanLabel).color}12`,
                    borderColor: `${getLabelInfo(orphanLabel).color}60`,
                  }}
                >
                  {orphanLabel}
                </span>
              )}

              <button
                aria-label="Add label"
                className="inline-flex cursor-pointer items-center justify-center rounded-ir-sm border border-dashed border-ir-border p-1.5 text-ir-muted transition-colors duration-150 ease-ir-standard hover:border-ir-primary/40 hover:text-ir-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                onClick={() => setLabelModalOpen(true)}
                title="Add label"
                type="button"
              >
                <PlusIcon className="size-3.5" />
              </button>
            </div>
            <div className="mt-1">
              <ChangelogLabelBadge label={label} size="md" />
            </div>
          </div>

          <Dialog
            onOpenChange={handleLabelModalOpenChange}
            open={labelModalOpen}
          >
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Add Label</DialogTitle>
                <DialogDescription>
                  Create a custom label for this workspace's changelog entries.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-ir-heading"
                  htmlFor="new-label"
                >
                  Name
                </label>
                <input
                  autoFocus
                  className="w-full rounded-ir-input border border-ir-border bg-ir-surface px-3 py-2 text-sm text-ir-body placeholder:text-ir-muted focus:outline-none focus:ring-2 focus:ring-ir-primary/40"
                  disabled={labelBusy}
                  id="new-label"
                  maxLength={40}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomLabel();
                    }
                  }}
                  placeholder="e.g. Security Fix"
                  type="text"
                  value={newLabel}
                />
              </div>
              <DialogFooter>
                <Button
                  disabled={labelBusy}
                  onClick={() => handleLabelModalOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!newLabel.trim() || labelBusy}
                  onClick={addCustomLabel}
                  type="button"
                >
                  {labelBusy ? "Creating…" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Linked Posts */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-ir-heading">
              Linked Feedback Posts
              <span className="ml-1 font-normal normal-case text-ir-muted">
                (optional)
              </span>
            </span>
            <p className="text-xs text-ir-muted">
              Link feedback posts that shipped in this update. Voters will be
              notified on first publish.
            </p>
            <LinkedPostsSelector
              onChange={setLinkedPosts}
              selectedPosts={linkedPosts}
              workspaceId={workspaceId}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ir-border pt-4">
            <div className="flex items-center gap-1.5">
              {saveStatus === "saving" && (
                <span className="animate-pulse text-xs text-ir-muted">
                  Saving…
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-xs text-ir-success">Saved</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={isPending}
                onClick={() =>
                  guardNavigation(() =>
                    router.push(`/${workspaceSlug}/settings/changelog`)
                  )
                }
                type="button"
                variant="outline"
              >
                Cancel
              </Button>

              {!isPublished && (
                <Button
                  disabled={isPending || !title.trim() || !isDirty}
                  onClick={handleSaveDraft}
                  type="button"
                  variant="outline"
                >
                  Save Draft
                </Button>
              )}

              {isPublished ? (
                <Button
                  disabled={isPending || !title.trim() || !isDirty}
                  onClick={handleUpdate}
                  type="button"
                >
                  {isPending ? "Saving…" : "Update"}
                </Button>
              ) : (
                <Button
                  disabled={isPending || !title.trim()}
                  onClick={handlePublish}
                  type="button"
                >
                  {isPending ? "Publishing…" : "Publish →"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </ContentContainer>
    </>
  );
}
