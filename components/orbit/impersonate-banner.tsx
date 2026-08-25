import { getCurrentSession } from "@/lib/authz";
import { ImpersonateBannerClient } from "./impersonate-banner-client";

export async function ImpersonateBanner() {
  const session = await getCurrentSession();

  if (!session?.session?.impersonatedBy) {
    return null;
  }

  return <ImpersonateBannerClient email={session.user.email} />;
}
