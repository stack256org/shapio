// postMessage protocol between the widget's host-page script (public/widget.js)
// and the app rendered inside its iframe. Kept as a small shared source string
// (not an import — widget.js is a standalone static file, not part of the
// Next.js build) so both sides agree on what they're listening for.
//
// Must match MESSAGE_SOURCE in public/widget.js exactly.
export const WIDGET_MESSAGE_SOURCE = "shapio-widget";

export type WidgetToHostMessage = {
  source: typeof WIDGET_MESSAGE_SOURCE;
  type: "close-request";
};

export type HostToWidgetMessage = {
  source: typeof WIDGET_MESSAGE_SOURCE;
  type: "closed";
};

// Asks the host page (widget.js's floating panel) to close — used by the
// in-modal close button, since the panel chrome itself lives outside the
// iframe and isn't reachable directly.
export function requestWidgetClose(): void {
  if (window.parent === window) {
    return;
  }
  const message: WidgetToHostMessage = {
    source: WIDGET_MESSAGE_SOURCE,
    type: "close-request",
  };
  window.parent.postMessage(message, "*");
}

export function isHostClosedMessage(
  data: unknown
): data is HostToWidgetMessage {
  return (
    !!data &&
    typeof data === "object" &&
    (data as Record<string, unknown>).source === WIDGET_MESSAGE_SOURCE &&
    (data as Record<string, unknown>).type === "closed"
  );
}
