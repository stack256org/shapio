import { FlagIcon } from "@phosphor-icons/react/dist/ssr";
import { FeatureFlagToggle } from "@/components/orbit/feature-flag-toggle";
import { PageBody } from "@/components/ui/page";
import { SetPageHeader } from "@/components/workspace/topbar";
import { listFeatureFlags } from "@/lib/orbit/feature-flags";

export const metadata = { title: "Feature Flags" };

// Flags only store a snake_case `key` in the db — humanize it for display so
// the row reads like a name ("Google Auth"), with the raw key kept alongside
// as a small code badge for anyone who needs the exact identifier.
function humanizeFlagKey(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function FeatureFlagsPage() {
  const flags = await listFeatureFlags();

  return (
    <div className="flex flex-col">
      <SetPageHeader
        description="Toggle platform-wide boolean features. Changes propagate within 60 seconds."
        portalHref={null}
        title="Feature Flags"
      />

      <PageBody>
        <div className="overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
          {flags.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
              <div className="flex size-10 items-center justify-center rounded-ir-full bg-ir-muted-surface text-ir-muted">
                <FlagIcon className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-ir-heading">
                  No feature flags yet
                </p>
                <p className="mt-1 text-xs text-ir-muted">
                  Start the worker to seed the default flags.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-ir-border">
              {flags.map((flag) => (
                <div
                  className="flex flex-col gap-2 px-4 py-3.5 transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  key={flag.key}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ir-heading">
                        {humanizeFlagKey(flag.key)}
                      </p>
                      <span className="badge h-auto inline-flex border-transparent rounded-ir-xs bg-ir-muted-surface px-1.5 py-0.5 font-mono text-2xs text-ir-muted">
                        {flag.key}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ir-muted">
                      {flag.description}
                    </p>
                  </div>
                  <FeatureFlagToggle
                    flagKey={flag.key}
                    isEnabled={flag.isEnabled}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </PageBody>
    </div>
  );
}
