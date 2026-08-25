import {
  CaretLeftIcon,
  CaretRightIcon,
  DotsThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

// Build the compact page window with ellipses, e.g. for page 6 of 20:
// [1, "dots", 5, 6, 7, "dots", 20]. `siblingCount` = pages shown either side of
// the current page.
function pageWindow(
  current: number,
  total: number,
  siblingCount = 1
): (number | "dots")[] {
  const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

  // first + last + current + 2 dots + siblings on each side
  const totalPageNumbers = siblingCount * 2 + 5;
  if (totalPageNumbers >= total) {
    return range(1, total);
  }

  const leftSibling = Math.max(current - siblingCount, 1);
  const rightSibling = Math.min(current + siblingCount, total);
  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < total - 2;

  if (!showLeftDots && showRightDots) {
    return [...range(1, 3 + 2 * siblingCount), "dots", total];
  }
  if (showLeftDots && !showRightDots) {
    return [1, "dots", ...range(total - (3 + 2 * siblingCount) + 1, total)];
  }
  return [1, "dots", ...range(leftSibling, rightSibling), "dots", total];
}

interface PostsPaginationProps {
  className?: string;
  currentPage: number;
  hrefForPage: (page: number) => string;
  totalPages: number;
}

// Numbered pagination for post/feedback lists. A plain server component (renders
// Next <Link>s, so navigation stays client-side and hrefForPage can be passed
// straight from a server page). Hidden entirely when there's only one page.
export function PostsPagination({
  currentPage,
  totalPages,
  hrefForPage,
  className,
}: PostsPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const items = pageWindow(currentPage, totalPages);
  const atStart = currentPage <= 1;
  const atEnd = currentPage >= totalPages;

  const edgeBtn = buttonVariants({ variant: "ghost", size: "sm" });
  const disabledEdge = cn(edgeBtn, "pointer-events-none opacity-40");

  return (
    <nav aria-label="pagination" className={cn("flex justify-end", className)}>
      <ul className="flex items-center gap-1">
        {/* Previous */}
        <li>
          {atStart ? (
            <span aria-disabled className={disabledEdge}>
              <CaretLeftIcon data-icon="inline-start" />
              <span className="hidden sm:block">Previous</span>
            </span>
          ) : (
            <Link
              aria-label="Go to previous page"
              className={edgeBtn}
              href={hrefForPage(currentPage - 1)}
            >
              <CaretLeftIcon data-icon="inline-start" />
              <span className="hidden sm:block">Previous</span>
            </Link>
          )}
        </li>

        {/* Page numbers */}
        {items.map((item, i) => (
          <li key={item === "dots" ? `dots-${i}` : item}>
            {item === "dots" ? (
              <span
                aria-hidden
                className="flex size-9 items-center justify-center text-ir-muted"
              >
                <DotsThreeIcon />
                <span className="sr-only">More pages</span>
              </span>
            ) : (
              <Link
                aria-current={item === currentPage ? "page" : undefined}
                aria-label={`Go to page ${item}`}
                className={cn(
                  buttonVariants({
                    variant: item === currentPage ? "outline" : "ghost",
                    size: "icon-sm",
                  }),
                  item === currentPage &&
                    "border-ir-primary/30 bg-ir-primary-light/20 text-ir-primary hover:bg-ir-primary-light/30"
                )}
                href={hrefForPage(item)}
              >
                {item}
              </Link>
            )}
          </li>
        ))}

        {/* Next */}
        <li>
          {atEnd ? (
            <span aria-disabled className={disabledEdge}>
              <span className="hidden sm:block">Next</span>
              <CaretRightIcon data-icon="inline-end" />
            </span>
          ) : (
            <Link
              aria-label="Go to next page"
              className={edgeBtn}
              href={hrefForPage(currentPage + 1)}
            >
              <span className="hidden sm:block">Next</span>
              <CaretRightIcon data-icon="inline-end" />
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
}
