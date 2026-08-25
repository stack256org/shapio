import { redirect } from "next/navigation";
import { ADMIN_ROLE } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { getFirstUserWorkspace } from "@/lib/workspaces/queries";

export default async function AccountProfileRedirect() {
  const session = await requireSession();

  if (session.user.role === ADMIN_ROLE) {
    redirect("/orbit/account");
  }

  const workspace = await getFirstUserWorkspace(session.user.id);
  if (workspace) {
    redirect(`/${workspace.slug}/settings/account`);
  }

  redirect("/post-auth");
}
