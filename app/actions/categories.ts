"use server";

import { z } from "zod";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { audit } from "@/lib/audit";
import { requireSession } from "@/lib/authz";
import { createCategory } from "@/lib/categories/create";
import { deleteCategory } from "@/lib/categories/delete";
import {
  countPostsInCategory,
  getCategoryById,
} from "@/lib/categories/queries";
import {
  reorderCategories,
  setDefaultCategory,
  updateCategory,
} from "@/lib/categories/update";
import { getPost, updatePostCategory } from "@/lib/posts/queries";
import {
  maxMeaningfulLength,
  minMeaningfulLength,
} from "@/lib/validation/text-length";
import { getWorkspaceMember } from "@/lib/workspaces/queries";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

// ─── Create Category ──────────────────────────────────────────────────────────

const createCategorySchema = z.object({
  workspaceId: z.string().min(1),
  name: z
    .string()
    .refine(minMeaningfulLength(1), "Name is required.")
    .refine(maxMeaningfulLength(64), "Name must be 64 characters or fewer."),
  description: z
    .string()
    .refine(
      maxMeaningfulLength(200),
      "Description must be 200 characters or fewer."
    )
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color.")
    .optional(),
});

export async function createCategoryAction(input: {
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
}): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: first?.message ?? "Invalid input.",
      field: first?.path[0] as string,
    };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage categories.",
    };
  }

  try {
    const category = await createCategory({
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      description: parsed.data.description,
      color: parsed.data.color,
    });

    audit({
      action: "category.created",
      actorId: session.user.id,
      actorEmail: session.user.email,
      description: `Category created: ${category.name}`,
      entityType: "category",
      entityId: category.id,
      metadata: { name: category.name, workspaceId: parsed.data.workspaceId },
    });

    return { success: true, data: { id: category.id } };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to create category.";
    if (msg.includes("unique")) {
      return {
        success: false,
        error: "A category with this name already exists.",
        field: "name",
      };
    }
    return { success: false, error: msg };
  }
}

// ─── Update Category ──────────────────────────────────────────────────────────

const updateCategorySchema = z.object({
  categoryId: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z
    .string()
    .refine(minMeaningfulLength(1), "Name is required.")
    .refine(maxMeaningfulLength(64), "Name must be 64 characters or fewer.")
    .optional(),
  description: z
    .string()
    .refine(
      maxMeaningfulLength(200),
      "Description must be 200 characters or fewer."
    )
    .nullable()
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  isArchived: z.boolean().optional(),
});

export async function updateCategoryAction(input: {
  categoryId: string;
  workspaceId: string;
  name?: string;
  description?: string | null;
  color?: string;
  isArchived?: boolean;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Invalid input." };
  }

  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage categories.",
    };
  }

  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.workspaceId !== parsed.data.workspaceId) {
    return { success: false, error: "Category not found." };
  }

  // The default category can't be archived — it's the one new posts fall
  // back to, and an archived category can no longer be assigned. Set
  // another category as default first.
  if (parsed.data.isArchived && category.isDefault) {
    return {
      success: false,
      error:
        "This is the default category. Set another category as default before archiving it.",
    };
  }

  try {
    await updateCategory(parsed.data.categoryId, {
      name: parsed.data.name,
      description: parsed.data.description,
      color: parsed.data.color,
      isArchived: parsed.data.isArchived,
    });

    return { success: true, data: undefined };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to update category.";
    if (msg.includes("unique")) {
      return {
        success: false,
        error: "A category with this name already exists.",
        field: "name",
      };
    }
    return { success: false, error: msg };
  }
}

// ─── Delete Category ──────────────────────────────────────────────────────────

export async function deleteCategoryAction(input: {
  categoryId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage categories.",
    };
  }

  const category = await getCategoryById(input.categoryId);
  if (!category || category.workspaceId !== input.workspaceId) {
    return { success: false, error: "Category not found." };
  }

  // Every post always has a category — a category currently in use, or the
  // workspace's default, can't be deleted out from under posts that rely on
  // it. Archive it instead, or reassign posts / set another default first.
  if (category.isDefault) {
    return {
      success: false,
      error:
        "This is the default category. Set another category as default before deleting it.",
    };
  }
  const postCount = await countPostsInCategory(input.categoryId);
  if (postCount > 0) {
    return {
      success: false,
      error: `This category is used by ${postCount} post${postCount === 1 ? "" : "s"}. Move them to another category first.`,
    };
  }

  await deleteCategory(input.categoryId);

  audit({
    action: "category.deleted",
    actorId: session.user.id,
    actorEmail: session.user.email,
    description: `Category deleted: ${category.name}`,
    entityType: "category",
    entityId: input.categoryId,
    metadata: { name: category.name, workspaceId: input.workspaceId },
  });

  return { success: true, data: undefined };
}

// ─── Set Default Category ─────────────────────────────────────────────────────

export async function setDefaultCategoryAction(input: {
  categoryId: string;
  workspaceId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage categories.",
    };
  }

  const category = await getCategoryById(input.categoryId);
  if (!category || category.workspaceId !== input.workspaceId) {
    return { success: false, error: "Category not found." };
  }
  if (category.isArchived) {
    return {
      success: false,
      error: "An archived category can't be the default. Restore it first.",
    };
  }

  await setDefaultCategory(input.workspaceId, input.categoryId);
  return { success: true, data: undefined };
}

// ─── Reorder Categories ───────────────────────────────────────────────────────

export async function reorderCategoriesAction(input: {
  workspaceId: string;
  orderedIds: string[];
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const member = await getWorkspaceMember(input.workspaceId, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    return {
      success: false,
      error: "Only admins and owners can manage categories.",
    };
  }

  await reorderCategories(input.workspaceId, input.orderedIds);
  return { success: true, data: undefined };
}

// ─── Update Post Category ─────────────────────────────────────────────────────

const updatePostCategorySchema = z.object({
  postId: z.string().min(1),
  workspaceId: z.string().min(1),
  categoryId: z.string().min(1, "A category is required."),
});

export async function updatePostCategoryAction(input: {
  postId: string;
  workspaceId: string;
  categoryId: string;
}): Promise<ActionResult<undefined>> {
  const session = await requireSession();

  const parsed = updatePostCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  // Assigning a category to a post is a triage action available to any workspace
  // member (PLATFORM.md §4). Creating/editing/deleting categories stays Brand-Admin-only.
  const member = await getWorkspaceMember(
    parsed.data.workspaceId,
    session.user.id
  );
  if (!member) {
    return {
      success: false,
      error: "Only workspace members can set post categories.",
    };
  }

  const post = await getPost(parsed.data.postId);
  if (!post || post.workspaceId !== parsed.data.workspaceId) {
    return { success: false, error: "Post not found." };
  }

  // Every post always has a category — verify it's a real category in this
  // workspace rather than trusting the ID blindly.
  const category = await getCategoryById(parsed.data.categoryId);
  if (!category || category.workspaceId !== parsed.data.workspaceId) {
    return { success: false, error: "Invalid category." };
  }

  await updatePostCategory(parsed.data.postId, parsed.data.categoryId);
  return { success: true, data: undefined };
}
