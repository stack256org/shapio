"use client";

import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Safety net for the workspace shell: if a resource (feedback, etc.) was
// removed after a link was created, a stale link renders this friendly page
// instead of a bare 404. Notification rows already flag removed items inline,
// so this primarily covers direct visits and delete-while-open races.
export default function WorkspaceNotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const slug = pathname?.split("/").filter(Boolean)[0];

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-base-200 text-base-content/60">
        <FileQuestion className="size-6" />
      </div>
      <h1 className="mt-5 text-lg font-semibold text-base-content">
        This item is no longer available
      </h1>
      <p className="mt-1.5 max-w-sm text-sm text-base-content/60">
        It may have been removed, or the link is no longer valid.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={() => router.back()} type="button" variant="outline">
          Go back
        </Button>
        {slug && (
          <Button asChild>
            <Link href={`/${slug}/notifications`}>View notifications</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
