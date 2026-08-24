"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, useCallback, useEffect } from "react";
import NewPostForm from "@/app/(public)/[slug]/b/[boardSlug]/new/_components/new-post-form";
import { PRODUCT_NAME } from "@/config/platform";
import type { EmbedSubmitTiming } from "@/lib/embed/queries";
import { isHostClosedMessage } from "@/lib/embed/widget-messages";
import { type Category, CategorySelectScreen } from "./category-select-screen";
import { EmbedModalHeader } from "./embed-modal-header";

interface EmbedWidgetShellProps {
  boardId: string;
  boardName: string;
  boardSlug: string;
  categories: Category[];
  embedQuery: string;
  isSignedIn: boolean;
  // Already combined by the caller: the workspace's page-level publicness
  // AND the widget's own "show a link to it" setting — a genuinely private
  // Roadmap/Changelog must never surface here regardless of the latter.
  showChangelog: boolean;
  showRoadmap: boolean;
  showSimilarPosts: boolean;
  showViewOtherFeedbackButton: boolean;
  submitFormTiming: EmbedSubmitTiming;
  workspaceId: string;
  workspaceSlug: string;
  // Widget-level theme/accent — the `dark` class and --primary CSS var
  // overrides computed by embedWrapperProps, same as the non-panel board
  // page applies to its own root. This shell is the panel's actual root
  // (the board page returns it before reaching its own themed wrapper), so
  // without these it always renders light no matter what data-theme says.
  wrapperClassName: string;
  wrapperStyle: CSSProperties;
}

// The widget's creation-only modal: Categories -> Feedback Form -> Success,
// as a persistent client-state machine (never a route change), plus links
// out to Roadmap/Changelog. `view`/`category` are reflected into this page's
// own URL (via router.replace) rather than kept in plain component state —
// that gives the iframe a real, always-valid history stack for browser
// back/forward, and is also how the widget resets itself: closing the host
// panel doesn't unmount this component (see the postMessage listener below),
// so without a URL-driven reset the widget would silently reopen wherever
// the visitor last left it instead of back at Categories.
export function EmbedWidgetShell({
  boardId,
  boardName,
  boardSlug,
  categories,
  embedQuery,
  isSignedIn,
  showChangelog,
  showRoadmap,
  showSimilarPosts,
  showViewOtherFeedbackButton,
  submitFormTiming,
  workspaceId,
  workspaceSlug,
  wrapperClassName,
  wrapperStyle,
}: EmbedWidgetShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion();

  const hasCategories = categories.length > 0;
  const roadmapHref = showRoadmap
    ? `/${workspaceSlug}/roadmap${embedQuery}`
    : null;
  const changelogHref = showChangelog
    ? `/${workspaceSlug}/changelog${embedQuery}`
    : null;

  // "auto" mirrors the Settings copy verbatim: skip straight to the form
  // when there's a single category and no Roadmap/Changelog link to show
  // instead. "always" skips regardless; "never" only skips when there's
  // nothing to pick from in the first place.
  const autoSkipsCategories =
    categories.length <= 1 && !roadmapHref && !changelogHref;
  const skipCategoriesScreen =
    !hasCategories ||
    submitFormTiming === "always" ||
    (submitFormTiming === "auto" && autoSkipsCategories);
  const view =
    searchParams.get("view") === "form" || skipCategoriesScreen
      ? "form"
      : "categories";
  const categoryId = searchParams.get("category");
  const activeCategory = categoryId
    ? categories.find((c) => c.id === categoryId)
    : undefined;

  const setUrl = useCallback(
    (next: { category?: string; view: "categories" | "form" }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.view === "categories") {
        params.delete("view");
        params.delete("category");
      } else {
        params.set("view", "form");
        if (next.category) {
          params.set("category", next.category);
        } else {
          params.delete("category");
        }
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const goToCategories = useCallback(() => {
    setUrl({ view: "categories" });
  }, [setUrl]);

  const selectCategory = useCallback(
    (category: Category) => {
      setUrl({ category: category.id, view: "form" });
    },
    [setUrl]
  );

  // Guards against a stale/hand-edited ?category= that no longer matches a
  // real category (e.g. it was archived) — never render a blank form.
  useEffect(() => {
    if (hasCategories && view === "form" && categoryId && !activeCategory) {
      goToCategories();
    }
  }, [activeCategory, categoryId, goToCategories, hasCategories, view]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (isHostClosedMessage(event.data)) {
        goToCategories();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [goToCategories]);

  const headerTitle =
    view === "form"
      ? (activeCategory?.name ?? boardName)
      : "Share your feedback";

  return (
    <div
      className={`flex h-dvh flex-col overflow-hidden bg-ir-background ${wrapperClassName}`}
      style={wrapperStyle}
    >
      <EmbedModalHeader
        icon={
          activeCategory && (
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-ir-full text-2xs font-semibold"
              style={{
                backgroundColor: `${activeCategory.color}18`,
                color: activeCategory.color,
              }}
            >
              {activeCategory.name.charAt(0).toUpperCase()}
            </span>
          )
        }
        onBack={view === "form" && hasCategories ? goToCategories : undefined}
        title={headerTitle}
      />
      <div className="relative min-h-0 flex-1">
        <AnimatePresence initial={false} mode="wait">
          {view === "categories" ? (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="absolute inset-0 flex flex-col"
              exit={shouldReduceMotion ? undefined : { opacity: 0, x: -12 }}
              initial={shouldReduceMotion ? false : { opacity: 0, x: -12 }}
              key="categories"
              transition={{
                duration: shouldReduceMotion ? 0 : 0.15,
                ease: "easeOut",
              }}
            >
              <CategorySelectScreen
                categories={categories}
                changelogHref={changelogHref}
                onSelectCategory={selectCategory}
                roadmapHref={roadmapHref}
              />
            </motion.div>
          ) : (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="absolute inset-0 overflow-y-auto"
              exit={shouldReduceMotion ? undefined : { opacity: 0, x: 12 }}
              initial={shouldReduceMotion ? false : { opacity: 0, x: 12 }}
              key="form"
              transition={{
                duration: shouldReduceMotion ? 0 : 0.15,
                ease: "easeOut",
              }}
            >
              <NewPostForm
                boardId={boardId}
                boardName={boardName}
                boardSlug={boardSlug}
                categories={categories}
                embedQuery={embedQuery}
                isEmbed
                isPanel
                isSignedIn={isSignedIn}
                onBack={hasCategories ? goToCategories : undefined}
                onPostAnother={goToCategories}
                panelCategory={activeCategory}
                showSimilarPosts={showSimilarPosts}
                showViewOtherFeedbackButton={showViewOtherFeedbackButton}
                workspaceId={workspaceId}
                workspaceSlug={workspaceSlug}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="shrink-0 border-t border-ir-border px-3 py-2 text-center">
        <span className="text-2xs text-ir-muted hover:text-ir-heading">
          Powered by {PRODUCT_NAME}
        </span>
      </div>
    </div>
  );
}
