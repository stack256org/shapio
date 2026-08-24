import Link from "next/link";
import { Button } from "@/components/ui/button";

const ROWS = [
  {
    feature: "Voter pricing",
    ir: "Free for everyone",
    canny: "Paid per voter",
    check: false,
  },
  {
    feature: "Data ownership",
    ir: "Your server",
    canny: "Canny's cloud",
    check: false,
  },
  {
    feature: "Notify voters on ship",
    ir: "Automatic",
    canny: "Manual only",
    check: true,
  },
  {
    feature: "Public roadmap",
    ir: "Included",
    canny: "Paid add-on",
    check: true,
  },
  {
    feature: "Changelog",
    ir: "Included",
    canny: "Paid plan only",
    check: true,
  },
  {
    feature: "Self-hosted option",
    ir: "Yes",
    canny: "No",
    check: true,
  },
  {
    feature: "Open source",
    ir: "MIT licensed",
    canny: "Proprietary",
    check: true,
  },
] as const;

export function Comparison() {
  return (
    <section className="bg-ir-muted-surface">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-8">
        <p className="text-xs font-bold tracking-eyebrow text-ir-success uppercase">
          Why Teams Switch
        </p>

        <h2 className="mt-4 text-3xl font-bold text-ir-heading sm:text-4xl">
          Built differently from day one.
        </h2>

        <p className="mt-3 max-w-2xl text-lg text-ir-muted">
          Canny charges per voter. Shapio doesn't. That's just the start.
        </p>

        <div className="mt-12 overflow-x-auto">
          <div className="min-w-120 overflow-hidden rounded-ir-lg border border-ir-border bg-ir-surface shadow-ir-xs">
            <table className="table w-full">
              <caption className="sr-only">
                Feature comparison of Shapio versus Canny
              </caption>
              <thead>
                <tr>
                  <th className="border-b border-ir-border bg-ir-muted-surface px-4 py-3 text-2xs font-semibold tracking-ui text-ir-muted uppercase">
                    Feature
                  </th>
                  <th className="border-b border-l border-ir-border bg-ir-primary px-4 py-3 text-2xs font-semibold tracking-ui text-ir-primary-foreground uppercase">
                    Shapio
                  </th>
                  <th className="border-b border-l border-ir-border bg-ir-muted-surface px-4 py-3 text-2xs font-semibold tracking-ui text-ir-muted uppercase">
                    Canny
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(({ feature, ir, canny, check }, index) => {
                  const rowBorder =
                    index === ROWS.length - 1
                      ? ""
                      : "border-b border-ir-border";
                  return (
                    <tr key={feature}>
                      <td
                        className={`px-4 py-3 text-sm font-medium text-ir-heading ${rowBorder}`}
                      >
                        {feature}
                      </td>
                      <td
                        className={`border-l border-ir-border px-4 py-3 ${rowBorder}`}
                      >
                        {check ? (
                          <span className="text-sm font-semibold text-ir-success">
                            ✓ {ir}
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-ir-heading">
                            {ir}
                          </span>
                        )}
                      </td>
                      <td
                        className={`border-l border-ir-border px-4 py-3 text-sm text-ir-muted ${rowBorder}`}
                      >
                        {check ? "✗ " : ""}
                        {canny}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Button asChild size="lg">
            <Link href="/signin">Start Free</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
