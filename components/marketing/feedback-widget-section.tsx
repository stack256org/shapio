import Script from "next/script";

interface FeedbackWidgetSectionProps {
  appUrl: string;
}

// Stable id so the widget script (loaded once via next/script) always finds
// the right mount point via data-container, regardless of where in the DOM
// next/script injects the <script> tag itself.
const WIDGET_CONTAINER_ID = "ir-marketing-feedback-widget";

export function FeedbackWidgetSection({ appUrl }: FeedbackWidgetSectionProps) {
  return (
    <section className="bg-ir-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-bold text-xs uppercase tracking-eyebrow text-ir-success">
            Got Feedback?
          </p>
          <h2 className="mt-4 font-bold text-3xl text-ir-heading sm:text-4xl">
            Tell us what to build next.
          </h2>
          <p className="mt-3 text-lg text-ir-muted">
            This is the same board you'd embed on your own site — vote, comment,
            or submit a request right here.
          </p>
        </div>

        <div className="mx-auto mt-10 w-full max-w-95">
          <div
            className="overflow-hidden rounded-ir-lg border border-ir-border shadow-ir-sm"
            id={WIDGET_CONTAINER_ID}
          />
        </div>
      </div>

      <Script
        data-accent-color="#111111"
        data-board="feature-requests"
        data-container={WIDGET_CONTAINER_ID}
        data-height="560"
        data-mode="inline"
        data-theme="light"
        data-width="380"
        data-workspace="deep-sir"
        id="shapio-feedback-widget-script"
        src={`${appUrl}/widget.js`}
        strategy="afterInteractive"
      />
    </section>
  );
}
