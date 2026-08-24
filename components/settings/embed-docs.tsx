import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CodeBlock } from "./code-block";

interface EmbedDocsProps {
  appUrl: string;
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="text-xs rounded-ir-xs bg-ir-muted-surface px-1 py-0.5">
      {children}
    </code>
  );
}

export function EmbedDocs({ appUrl }: EmbedDocsProps) {
  return (
    <div className="mt-8 overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
      <div className="border-b border-ir-border px-5 py-4">
        <h2 className="text-sm font-semibold text-ir-heading">
          Embed documentation
        </h2>
        <p className="mt-0.5 text-xs text-ir-muted">
          How the widget script works and how to integrate it on your site.
        </p>
      </div>

      <Accordion className="px-5" collapsible type="single">
        <AccordionItem value="what">
          <AccordionTrigger>What is the feedback widget?</AccordionTrigger>
          <AccordionContent>
            <p className="text-ir-muted">
              A single script tag that adds a Floating or Sticky button to your
              site. Clicking it opens a small, creation-only modal — pick a
              category, write feedback, submit — plus Roadmap and Changelog if
              you've made those public. It's a plain iframe pointed at this app,
              so it's public and anonymous by design — visitors don't sign in
              with anything related to your account.
            </p>
            <p className="text-ir-muted">
              The widget never shows a list of existing feedback to browse —
              that's what your Public Portal is for. "View Other Feedback" on
              the widget's success screen opens your portal in a new tab for
              exactly that.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="workflow">
          <AccordionTrigger>Install once, manage forever</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p className="text-ir-muted">
              <InlineCode>widget.js</InlineCode> is hosted by Shapio once it's
              installed, there's nothing to download, host, or update yourself.
              Future widget improvements are delivered automatically the next
              time it loads.
            </p>
            <ol className="list-decimal space-y-1.5 pl-4 text-ir-muted">
              <li>Copy the embed script from Settings → Embed above.</li>
              <li>
                Install it once in your site's global layout or template (see
                placement guidance below).
              </li>
              <li>Never edit or replace the installed script again.</li>
              <li>
                Customize the widget anytime from{" "}
                <strong className="text-ir-heading">Workspace → Embed</strong>{" "}
                button type, position, colors, icon, text, and behavior are all
                managed here, not in your website's code.
              </li>
              <li>
                Changes appear automatically on every site using that snippet,
                usually within a few seconds (a short caching window on the
                script's own settings fetch, not something you need to manage).
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="placement">
          <AccordionTrigger>Where to place the script</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-ir-muted">
              The short answer: paste it once, just before{" "}
              <InlineCode>{"</body>"}</InlineCode>, in whatever file or layout
              already wraps every page of your site. Both button types attach a
              fixed-position trigger to <InlineCode>document.body</InlineCode>{" "}
              and wait for the page to be ready before mounting, so exactly
              where the tag sits in your HTML doesn't affect how the widget
              looks or behaves.
            </p>

            <div>
              <p className="text-sm font-medium text-ir-heading">Plain HTML</p>
              <p className="mt-1 text-ir-muted">
                Add it to your shared header/footer include (or every page, if
                your site doesn't have one) just before{" "}
                <InlineCode>{"</body>"}</InlineCode>.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-ir-heading">
                React (Create React App, Vite)
              </p>
              <p className="mt-1 text-ir-muted">
                Add it to <InlineCode>public/index.html</InlineCode>, just
                before <InlineCode>{"</body>"}</InlineCode>. These are
                single-page apps with one HTML shell — this one placement covers
                the whole app, including client-side route changes.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-ir-heading">Next.js</p>
              <p className="mt-1 text-ir-muted">
                This is a general App Router constraint, not specific to this
                widget: <InlineCode>next/script</InlineCode> dedupes injected
                scripts by URL, so if the same script is ever loaded a second
                way anywhere else on the page, only one load actually runs. A
                raw <InlineCode>{"<script>"}</InlineCode> tag in JSX only
                executes during the initial server-rendered page load and
                silently does nothing on a client-side navigation back to a page
                that already has it in its markup. Either can make a persistent
                third-party widget disappear after the first click-through.
              </p>
              <p className="mt-2 text-ir-muted">
                The reliable pattern for any script meant to persist across
                client-side navigation is a small Client Component in your root
                layout that injects it imperatively, guarded by id so remounting
                doesn't inject (and boot) it twice:
              </p>
              <CodeBlock
                code={`"use client";

import { useEffect } from "react";

export function FeedbackWidget() {
  useEffect(() => {
    if (document.getElementById("shapio-widget-script")) return;
    const script = document.createElement("script");
    script.id = "shapio-widget-script";
    script.src = "${appUrl}/widget.js";
    script.dataset.workspace = "acme";
    document.body.appendChild(script);
  }, []);
  return null;
}`}
              />
            </div>

            <div>
              <p className="text-sm font-medium text-ir-heading">Vue</p>
              <p className="mt-1 text-ir-muted">
                Same idea as React: add it to{" "}
                <InlineCode>public/index.html</InlineCode>, just before{" "}
                <InlineCode>{"</body>"}</InlineCode>. One placement, one HTML
                shell, covers every route.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-ir-heading">Shopify</p>
              <p className="mt-1 text-ir-muted">
                Online Store → Themes → Edit code →{" "}
                <InlineCode>theme.liquid</InlineCode>, just before{" "}
                <InlineCode>{"</body>"}</InlineCode>.{" "}
                <InlineCode>theme.liquid</InlineCode> wraps every page the theme
                renders, so this one edit is site-wide.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-ir-heading">WordPress</p>
              <p className="mt-1 text-ir-muted">
                Preferred: a header/footer plugin (e.g. WPCode, Insert Headers
                and Footers) set to inject into the site-wide footer — this
                survives theme updates. The manual alternative is your theme's{" "}
                <InlineCode>footer.php</InlineCode>, just before{" "}
                <InlineCode>{"</body>"}</InlineCode>, but that requires a child
                theme to avoid losing the edit next time the theme updates.
              </p>
            </div>

            <div className="space-y-2 border-t border-ir-border pt-4">
              <p className="text-sm font-medium text-ir-heading">
                Common questions
              </p>
              <p className="text-ir-muted">
                <strong className="text-ir-heading">
                  Does it have to be before {"</body>"}?
                </strong>{" "}
                That's the recommended default, not a requirement — it keeps the
                script from being one of the first things the browser has to
                fetch and run. It also works from{" "}
                <InlineCode>{"<head>"}</InlineCode>, since it waits for the page
                to be ready before mounting; add an{" "}
                <InlineCode>async</InlineCode> (or{" "}
                <InlineCode>defer</InlineCode>) attribute to the tag if you
                place it there, so it doesn't block the rest of the page from
                loading.
              </p>
              <p className="text-ir-muted">
                <strong className="text-ir-heading">
                  Every page, or once?
                </strong>{" "}
                Once — but "once" means once in whatever shared
                layout/template/partial already renders on every page of your
                site (a root layout, a footer include, a theme file), not
                copy-pasted individually into each page's markup. For a
                single-page app (React, Vue, Next.js), that shared place is the
                one HTML shell the whole app boots from.
              </p>
              <p className="text-ir-muted">
                <strong className="text-ir-heading">
                  Anything to watch for in a SPA specifically?
                </strong>{" "}
                Keep it in a persistent, app-root-level place — not inside a
                page/route component that unmounts on navigation, which would
                keep re-running it. If it does end up running more than once on
                the same page for any reason, the widget itself guards against a
                second button appearing — but it's still simpler to install it
                in exactly one persistent spot.
              </p>
              <p className="text-ir-muted">
                <strong className="text-ir-heading">
                  Best placement for performance?
                </strong>{" "}
                Just before <InlineCode>{"</body>"}</InlineCode>. It never
                blocks your page's own content from rendering, and settings
                (button type, colors, position) are fetched by the script itself
                only once it runs.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="snippet">
          <AccordionTrigger>Integration example</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p className="text-ir-muted">
              Install this once, anywhere on your site:
            </p>
            <CodeBlock
              code={`<script src="${appUrl}/widget.js"
        data-workspace="acme"></script>`}
            />
            <p className="text-ir-muted">
              <code className="text-xs rounded-ir-xs bg-ir-muted-surface px-1 py-0.5">
                data-workspace
              </code>{" "}
              is the only thing this tag needs — it's a fixed identifier for
              your workspace, so it never changes. Everything else (button type,
              position, colors, icon, size, device visibility) lives in the
              settings above and is fetched by the script itself. Change a
              setting, save, and every site with this snippet installed picks it
              up automatically — no re-copying, no code edit.
            </p>
            <p className="text-ir-muted">
              Settings changes reach live sites within a few seconds (the
              script's own caching window), not instantly — if you save a change
              and still see the old version, give it a moment and refresh.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="how">
          <AccordionTrigger>How it works</AccordionTrigger>
          <AccordionContent className="space-y-2">
            <ul className="list-disc space-y-1.5 pl-4 text-ir-muted">
              <li>
                On load, the script fetches your workspace's current widget
                settings from this app, then builds a fixed-size iframe pointed
                at the board you've configured above — hidden until the trigger
                is clicked, then it opens as a floating panel.
              </li>
              <li>
                The panel's iframe is created once and never reloaded while the
                trigger is clicked open and closed again — closing just hides
                the panel and resets it back to the category screen for next
                time, without a fresh network request.
              </li>
              <li>
                Theme and accent color are passed through the iframe's URL query
                string and applied inside the embedded page.{" "}
                <strong className="text-ir-heading">Auto theme</strong> is a
                placeholder for now — it renders light, since there's no visitor
                OS-preference detection wired up yet.
              </li>
              <li>
                Device visibility is checked once at load — leaving a device
                category off in the settings above means the widget doesn't
                mount at all for visitors on that size of screen.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="legacy">
          <AccordionTrigger>Legacy installs (advanced)</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p className="text-ir-muted">
              Snippets generated before this page fetched settings live listed
              every option directly on the tag. Those still work — the script
              reads them forever — but this form is no longer generated here and
              isn't something to reach for on a new install:
            </p>
            <CodeBlock
              code={`<script src="${appUrl}/widget.js"
        data-workspace="acme"
        data-board="feature-requests"
        data-button-type="sticky"
        data-sticky-position="right-middle"
        data-sticky-text="Leave Feedback"
        data-sticky-button-color="#111111"
        data-sticky-text-color="#ffffff"
        data-theme="light"
        data-width="380"
        data-height="560"
        data-accent-color="#111111"
        data-devices="desktop,tablet,mobile"></script>`}
            />
            <p className="text-ir-muted">
              Any attribute set this way overrides that one setting on that one
              install, permanently — it stops following changes made in the
              settings above for whichever fields it specifies. This is mainly
              useful for pinning one specific install to a board other than your
              workspace's configured one; there's currently no way to do that
              from the minimal snippet.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="troubleshooting">
          <AccordionTrigger>
            Common errors &amp; troubleshooting
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc space-y-1.5 pl-4 text-ir-muted">
              <li>
                <strong className="text-ir-heading">
                  Nothing renders, console shows "data-workspace attribute is
                  required"
                </strong>{" "}
                — the script tag is missing{" "}
                <code className="text-xs rounded-ir-xs bg-ir-muted-surface px-1 py-0.5">
                  data-workspace
                </code>
                . Re-copy the snippet above.
              </li>
              <li>
                <strong className="text-ir-heading">
                  A "configuration error" notice appears in place of the widget
                </strong>{" "}
                — this workspace has no public board configured, so there's
                nothing to embed. Choose a board above (Boards must be public
                and not archived).
              </li>
              <li>
                <strong className="text-ir-heading">
                  I changed settings above but the live site looks the same
                </strong>{" "}
                — give it a few seconds and refresh; the script caches its
                fetched settings briefly. If it's been longer than that, check
                the browser console for a warning about the settings fetch
                failing.
              </li>
              <li>
                <strong className="text-ir-heading">
                  Accent/button/text color isn't applying
                </strong>{" "}
                — each is validated as a 6-digit hex code (
                <code className="text-xs rounded-ir-xs bg-ir-muted-surface px-1 py-0.5">
                  #2563eb
                </code>
                ); anything else is silently ignored and falls back to the
                default.
              </li>
              <li>
                <strong className="text-ir-heading">
                  A visitor is asked to sign in before submitting
                </strong>{" "}
                — that's expected; submitting still requires a visitor account,
                same as the public portal. Inside the widget it's a one-time
                email code entered without leaving the panel, and the draft they
                were filling in resumes automatically once they're signed in.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="security">
          <AccordionTrigger>Best practices</AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc space-y-1.5 pl-4 text-ir-muted">
              <li>
                Only public boards can be embedded — the widget is anonymous, so
                private-board content is never exposed through it.
              </li>
              <li>
                Install the snippet once and manage everything from this page
                afterward — there's no need to touch the installed script again
                unless you're moving it to a different workspace.
              </li>
              <li>
                Use the Floating Button on marketing/product pages where
                feedback is secondary, and the Sticky Button on a dedicated
                feedback or support page where you want it always visible.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
