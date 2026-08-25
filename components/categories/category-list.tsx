"use client";

import {
  ArchiveIcon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createCategoryAction,
  deleteCategoryAction,
  setDefaultCategoryAction,
  updateCategoryAction,
} from "@/app/actions/categories";
import { Button } from "@/components/ui/button";
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { ContentContainer } from "@/components/ui/page";
import { SetPageHeader } from "@/components/workspace/topbar";
import { useDirtyState } from "@/hooks/use-dirty-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { CategoryChip } from "./category-chip";

interface Category {
  color: string;
  description: string | null;
  displayOrder: number;
  id: string;
  isArchived: boolean;
  isDefault: boolean;
  name: string;
  slug: string;
}

interface CategoryListProps {
  canManage: boolean;
  categories: Category[];
  workspaceId: string;
}

interface FormState {
  categoryId?: string;
  color: string;
  description: string;
  mode: "create" | "edit";
  name: string;
}

const DEFAULT_FORM: FormState = {
  mode: "create",
  name: "",
  description: "",
  color: "#6366f1",
};

export function CategoryList({
  categories,
  workspaceId,
  canManage,
}: CategoryListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isDirty, markClean } = useDirtyState({
    name: form?.name ?? "",
    description: form?.description ?? "",
    color: form?.color ?? "",
  });
  const { guardNavigation } = useUnsavedChangesGuard(isDirty);

  function openCreate() {
    setForm({ ...DEFAULT_FORM });
    setError(null);
    markClean({
      name: DEFAULT_FORM.name,
      description: DEFAULT_FORM.description,
      color: DEFAULT_FORM.color,
    });
  }

  function openEdit(cat: Category) {
    setForm({
      mode: "edit",
      categoryId: cat.id,
      name: cat.name,
      description: cat.description ?? "",
      color: cat.color,
    });
    setError(null);
    markClean({
      name: cat.name,
      description: cat.description ?? "",
      color: cat.color,
    });
  }

  function closeForm() {
    setForm(null);
    setError(null);
    // useDirtyState compares against `form?.field ?? ""` — once `form` goes
    // back to null those computed values collapse to all-empty, so the
    // baseline (still holding the pre-close values) must collapse the same
    // way or isDirty falsely flips true right after a successful save.
    markClean({ name: "", description: "", color: "" });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) {
      return;
    }
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    startTransition(async () => {
      let result;
      if (form.mode === "create") {
        result = await createCategoryAction({
          workspaceId,
          name: trimmedName,
          description: form.description.trim() || undefined,
          color: form.color,
        });
      } else {
        result = await updateCategoryAction({
          categoryId: form.categoryId!,
          workspaceId,
          name: trimmedName,
          description: form.description.trim() || null,
          color: form.color,
        });
      }

      if (!result.success) {
        setError(result.error);
        return;
      }

      toast.success(
        form.mode === "create" ? "Category created" : "Category updated"
      );
      closeForm();
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) {
      return;
    }
    startTransition(async () => {
      const result = await deleteCategoryAction({
        categoryId: deleteTarget.id,
        workspaceId,
      });
      setDeleteTarget(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Category deleted");
      router.refresh();
    });
  }

  function handleSetDefault(cat: Category) {
    startTransition(async () => {
      const result = await setDefaultCategoryAction({
        categoryId: cat.id,
        workspaceId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`"${cat.name}" is now the default category`);
      router.refresh();
    });
  }

  function handleArchiveToggle() {
    if (!archiveTarget) {
      return;
    }
    startTransition(async () => {
      const result = await updateCategoryAction({
        categoryId: archiveTarget.id,
        workspaceId,
        isArchived: !archiveTarget.isArchived,
      });
      setArchiveTarget(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        archiveTarget.isArchived ? "Category restored" : "Category archived"
      );
      router.refresh();
    });
  }

  const active = categories.filter((c) => !c.isArchived);
  const archived = categories.filter((c) => c.isArchived);

  return (
    <div className="flex h-full flex-col">
      <SetPageHeader
        actions={
          canManage && !form ? (
            <Button onClick={openCreate}>
              <PlusIcon data-icon="inline-start" />
              New Category
            </Button>
          ) : undefined
        }
        description="Organize feedback posts with workspace-level categories."
        title="Categories"
      />

      <ContentContainer className="flex-1 space-y-6">
        {/* Inline form */}
        {form && canManage && (
          <form
            className="space-y-4 rounded-ir-card border border-ir-border bg-ir-surface p-4 shadow-ir-xs"
            onSubmit={handleSubmit}
          >
            <h3 className="text-sm font-semibold text-ir-heading">
              {form.mode === "create" ? "New Category" : "Edit Category"}
            </h3>

            <div className="space-y-3">
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-ir-heading"
                  htmlFor="category-name"
                >
                  Name <span className="text-ir-danger">*</span>
                </label>
                <Input
                  id="category-name"
                  maxLength={64}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, name: e.target.value })
                  }
                  placeholder="e.g. Bug, Feature Request"
                  type="text"
                  value={form.name}
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-xs font-medium text-ir-heading"
                  htmlFor="category-description"
                >
                  Description{" "}
                  <span className="font-normal text-ir-muted">(optional)</span>
                </label>
                <Input
                  id="category-description"
                  maxLength={200}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, description: e.target.value })
                  }
                  placeholder="Short description"
                  type="text"
                  value={form.description}
                />
              </div>

              <div>
                <span className="mb-2 block text-xs font-medium text-ir-heading">
                  Color
                </span>
                <ColorSwatchPicker
                  onChange={(c) => setForm((f) => f && { ...f, color: c })}
                  value={form.color}
                />
                {form.name && (
                  <div className="mt-2">
                    <CategoryChip
                      color={form.color}
                      name={form.name || "Preview"}
                    />
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-xs text-ir-danger">{error}</p>}

            <div className="flex items-center gap-2">
              <Button disabled={isPending || !isDirty} type="submit">
                {isPending
                  ? "Saving…"
                  : form.mode === "create"
                    ? "Create"
                    : "Save Changes"}
              </Button>
              <Button
                disabled={isPending}
                onClick={closeForm}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Active categories */}
        {active.length === 0 && !form ? (
          <div className="rounded-ir-card border border-dashed border-ir-border py-12 text-center">
            <p className="text-sm text-ir-muted">No categories yet.</p>
            {canManage && (
              <button
                className="mt-3 cursor-pointer rounded-ir-sm text-sm text-ir-primary hover:underline focus-visible:outline-none"
                onClick={openCreate}
                type="button"
              >
                Create your first category
              </button>
            )}
          </div>
        ) : (
          active.length > 0 && (
            <div className="divide-y divide-ir-border overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
              {active.map((cat) => (
                <div
                  className="flex flex-col gap-2 px-4 py-4 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface sm:flex-row sm:items-center sm:gap-4"
                  key={cat.id}
                >
                  <CategoryChip color={cat.color} name={cat.name} />
                  {cat.isDefault && (
                    <span className="flex items-center gap-1 rounded-ir-sm border border-ir-border px-1.5 py-0.5 text-2xs font-medium text-ir-muted">
                      <StarIcon
                        className="size-2.5 text-ir-warning"
                        weight="fill"
                      />
                      Default
                    </span>
                  )}
                  {cat.description && (
                    <span className="truncate text-xs text-ir-muted sm:flex-1">
                      {cat.description}
                    </span>
                  )}
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1 sm:ml-auto">
                      {!cat.isDefault && (
                        <Button
                          aria-label={`Set ${cat.name} as default`}
                          className="group text-ir-muted hover:text-ir-warning"
                          onClick={() => handleSetDefault(cat)}
                          size="icon-xs"
                          title="Set as default"
                          variant="ghost"
                        >
                          <StarIcon className="group-hover:hidden" />
                          <StarIcon
                            className="hidden group-hover:block"
                            weight="fill"
                          />
                        </Button>
                      )}
                      <Button
                        aria-label={`Edit ${cat.name}`}
                        className="text-ir-primary"
                        onClick={() => guardNavigation(() => openEdit(cat))}
                        size="icon-xs"
                        title="Edit"
                        variant="ghost"
                      >
                        <PencilIcon />
                      </Button>
                      {!cat.isDefault && (
                        <Button
                          aria-label={`Archive ${cat.name}`}
                          onClick={() => setArchiveTarget(cat)}
                          size="icon-xs"
                          title="Archive"
                          variant="ghost"
                        >
                          <ArchiveIcon />
                        </Button>
                      )}
                      {!cat.isDefault && (
                        <Button
                          aria-label={`Delete ${cat.name}`}
                          className="text-ir-danger"
                          onClick={() => setDeleteTarget(cat)}
                          size="icon-xs"
                          title="Delete"
                          variant="ghost"
                        >
                          <TrashIcon />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* Archived categories */}
        {archived.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wider text-ir-muted uppercase">
              Archived
            </p>
            <div className="divide-y divide-ir-border overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface opacity-60">
              {archived.map((cat) => (
                <div
                  className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:gap-4"
                  key={cat.id}
                >
                  <CategoryChip color={cat.color} name={cat.name} />
                  {cat.description && (
                    <span className="truncate text-xs text-ir-muted sm:flex-1">
                      {cat.description}
                    </span>
                  )}
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1 sm:ml-auto">
                      <Button
                        aria-label={`Restore ${cat.name}`}
                        onClick={() => setArchiveTarget(cat)}
                        size="xs"
                        title="Restore"
                        variant="ghost"
                      >
                        Restore
                      </Button>
                      <Button
                        aria-label={`Delete ${cat.name}`}
                        className="text-ir-danger"
                        onClick={() => setDeleteTarget(cat)}
                        size="icon-xs"
                        title="Delete"
                        variant="ghost"
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirm delete */}
        <ConfirmDialog
          confirmLabel="Delete"
          description={`Delete "${deleteTarget?.name}"? This action cannot be undone. Every post needs a category, so this is only possible if no posts currently use it.`}
          isPending={isPending}
          onConfirm={handleDelete}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          open={!!deleteTarget}
          title="Delete Category"
          variant="destructive"
        />

        {/* Confirm archive */}
        <ConfirmDialog
          confirmLabel={archiveTarget?.isArchived ? "Restore" : "Archive"}
          description={
            archiveTarget?.isArchived
              ? `Restore "${archiveTarget?.name}"? It will be available for new posts again.`
              : `Archive "${archiveTarget?.name}"? It will be hidden from new post selections.`
          }
          isPending={isPending}
          onConfirm={handleArchiveToggle}
          onOpenChange={(open) => !open && setArchiveTarget(null)}
          open={!!archiveTarget}
          title={
            archiveTarget?.isArchived ? "Restore Category" : "Archive Category"
          }
          variant="default"
        />
      </ContentContainer>
    </div>
  );
}
