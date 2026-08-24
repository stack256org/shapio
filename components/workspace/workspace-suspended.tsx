import Link from "next/link";

export function WorkspaceSuspendedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base-200 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="grid size-12 place-items-center border border-error/30 bg-error/5">
            <span className="text-xl">⚠</span>
          </div>
        </div>
        <h1 className="font-black text-xl tracking-normal text-base-content">
          Workspace Suspended
        </h1>
        <p className="mt-3 text-sm text-base-content/60">
          This workspace has been suspended and is temporarily unavailable. If
          you believe this is an error, please contact the platform
          administrator.
        </p>
        <div className="mt-8">
          <Link
            className="text-xs font-semibold uppercase tracking-ui text-base-content/60 hover:text-base-content transition-colors duration-150"
            href="/post-auth"
          >
            ← Back
          </Link>
        </div>
      </div>
    </div>
  );
}
