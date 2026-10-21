"use client";

import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// App-wide 404. Without it Next.js renders its bare black default page, which
// leaves the visitor with no way out. Segment-level not-found files (e.g. the
// workspace shell's) still take precedence inside their own routes.
export default function NotFound() {
  const router = useRouter();

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      id="main-content"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-base-200 text-base-content/60">
        <FileQuestion className="size-6" />
      </div>
      <p className="mt-5 text-sm font-medium text-base-content/60">404</p>
      <h1 className="mt-1 text-lg font-semibold text-base-content">
        Page not found
      </h1>
      <p className="mt-1.5 max-w-sm text-sm text-base-content/60">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => router.back()} type="button" variant="outline">
          Go back
        </Button>
        <Button asChild>
          <Link href="/">Go to home</Link>
        </Button>
      </div>
    </main>
  );
}
