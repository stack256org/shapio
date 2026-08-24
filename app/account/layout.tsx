import type { ReactNode } from "react";
import { requireSession } from "@/lib/authz";

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSession();
  return <>{children}</>;
}
