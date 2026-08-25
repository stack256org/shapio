import { ChatCircleIcon, UserIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { NewFeedbackButton } from "@/components/portal/new-feedback-button";

interface Category {
  color: string;
  id: string;
  isArchived: boolean;
  name: string;
}

interface CategorySidebarProps {
  activeCategoryId: string;
  activeSearch: string;
  activeSort: string;
  activeStatus: string;
  boardSlug: string;
  categories: Category[];
  // Carries embed=1/theme/accentColor into these filter links so switching
  // category/My-Posts while embedded doesn't fall back to full Public Portal
  // chrome. Already URL-prefixed with "?" when set (see buildEmbedQuery);
  // empty outside the embed.
  embedQuery?: string;
  isMine: boolean;
  isSignedIn: boolean;
  newPostHref?: string;
  slug: string;
}

function buildHref(
  slug: string,
  boardSlug: string,
  embedQuery: string,
  params: {
    category?: string;
    mine?: boolean;
    search?: string;
    sort?: string;
    status?: string;
  }
): string {
  const qs = new URLSearchParams();
  if (params.sort && params.sort !== "newest") {
    qs.set("sort", params.sort);
  }
  if (params.status) {
    qs.set("status", params.status);
  }
  if (params.search) {
    qs.set("q", params.search);
  }
  if (params.category) {
    qs.set("category", params.category);
  }
  if (params.mine) {
    qs.set("mine", "1");
  }
  const s = qs.toString();
  if (!s) {
    return `/${slug}/b/${boardSlug}${embedQuery}`;
  }
  const separator = embedQuery ? "&" : "?";
  return `/${slug}/b/${boardSlug}${embedQuery}${separator}${s}`;
}

// Right-hand nav for the public board page — "+ Feedback" submission button
// plus category filters and (when signed in) a "My Posts" filter. Only the
// category/mine mode changes on click; sort/status/search are preserved so
// switching doesn't reset the rest of the view. Category and "My Posts" are
// mutually exclusive modes, like the reference product's own sidebar.
export function CategorySidebar({
  categories,
  activeCategoryId,
  activeSort,
  activeStatus,
  activeSearch,
  isMine,
  isSignedIn,
  slug,
  boardSlug,
  newPostHref,
  embedQuery = "",
}: CategorySidebarProps) {
  const activeCategories = categories.filter((c) => !c.isArchived);
  const itemClass = (isActive: boolean) =>
    `flex items-center gap-2 rounded-ir-sm px-3 py-2 text-sm transition-colors duration-150 ease-ir-standard ${
      isActive
        ? "bg-ir-primary-light/15 font-medium text-ir-primary"
        : "text-ir-body hover:bg-ir-muted-surface"
    }`;

  return (
    <aside className="w-full shrink-0 space-y-4 lg:w-56">
      {newPostHref && <NewFeedbackButton href={newPostHref} />}

      <nav className="space-y-0.5">
        <Link
          className={itemClass(!activeCategoryId && !isMine)}
          href={buildHref(slug, boardSlug, embedQuery, {
            sort: activeSort,
            status: activeStatus,
            search: activeSearch,
          })}
        >
          <ChatCircleIcon className="size-4" />
          All Posts
        </Link>
        {activeCategories.map((category) => (
          <Link
            className={itemClass(!isMine && activeCategoryId === category.id)}
            href={buildHref(slug, boardSlug, embedQuery, {
              sort: activeSort,
              status: activeStatus,
              search: activeSearch,
              category: category.id,
            })}
            key={category.id}
          >
            <span
              className="inline-block shrink-0 rounded-full"
              style={{ width: 6, height: 6, backgroundColor: category.color }}
            />
            {category.name}
          </Link>
        ))}
      </nav>

      {isSignedIn && (
        <nav className="space-y-0.5 border-t border-ir-border pt-4">
          <Link
            className={itemClass(isMine)}
            href={buildHref(slug, boardSlug, embedQuery, {
              sort: activeSort,
              status: activeStatus,
              search: activeSearch,
              mine: true,
            })}
          >
            <UserIcon className="size-4" />
            My Posts
          </Link>
        </nav>
      )}
    </aside>
  );
}
