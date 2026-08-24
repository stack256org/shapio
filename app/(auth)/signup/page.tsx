import { redirect } from "next/navigation";
import { redirectToSetupIfNeeded } from "@/lib/setup";

export const metadata = {
  title: "Sign up",
};

// There is no self-serve registration on this instance. Accounts come from the
// first-run /setup wizard (the first Orbit Admin) or from an invitation sent by
// a Brand Admin — enforced at the auth layer in lib/users/registration.ts, not
// merely by hiding this page.
//
// The route is kept rather than deleted so existing links, bookmarks, and
// search results land somewhere sensible instead of a 404.
export default async function SignupPage() {
  await redirectToSetupIfNeeded();
  redirect("/signin");
}
