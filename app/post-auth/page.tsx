import { redirect } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { getPendingInviteTokenForEmail } from "@/lib/workspaces/invites";
import { getFirstUserWorkspace } from "@/lib/workspaces/queries";

export default async function PostAuthPage() {
  const session = await requireSession();

  const workspace = await getFirstUserWorkspace(session.user.id);
  if (workspace) {
    redirect(`/${workspace.slug}`);
  }

  // No workspace yet — either a genuine first-time signup, or someone with a
  // pending invite who didn't land back on /invite/[token] to accept it (e.g.
  // signed in from a bookmarked /signin link rather than the emailed one).
  // Send the latter back to finish accepting instead of into onboarding.
  const inviteToken = await getPendingInviteTokenForEmail(session.user.email);
  redirect(inviteToken ? `/invite/${inviteToken}` : "/onboarding");
}
