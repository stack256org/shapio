import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryList } from "@/components/categories/category-list";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { getCategoriesForWorkspace } from "@/lib/categories/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Categories — ${slug}` };
}

export default async function CategoriesPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  // Workspace settings are Brand Admin only (PLATFORM.md §7).
  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member || member.role === WORKSPACE_MEMBER) {
    notFound();
  }

  const categories = await getCategoriesForWorkspace(workspace.id);
  const canManage = true;

  return (
    <CategoryList
      canManage={canManage}
      categories={categories}
      workspaceId={workspace.id}
    />
  );
}
