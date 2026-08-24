"use client";

import {
  BugIcon,
  CaretRightIcon,
  ChatCircleDotsIcon,
  LightbulbIcon,
  MapTrifoldIcon,
  MegaphoneIcon,
} from "@phosphor-icons/react";
import { useReducedMotion } from "framer-motion";
import Link from "next/link";

export interface Category {
  color: string;
  id: string;
  isDefault: boolean;
  name: string;
}

interface CategorySelectScreenProps {
  categories: Category[];
  changelogHref: string | null;
  onSelectCategory: (category: Category) => void;
  roadmapHref: string | null;
}

// Categories have no icon of their own (just a name + color) — a small
// keyword heuristic gets close to the reference's per-category icons (bug
// report, lightbulb for ideas, etc.) without adding an icon field to the
// data model for what's ultimately a cosmetic touch.
function iconForCategory(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("bug")) {
    return BugIcon;
  }
  if (
    lower.includes("feature") ||
    lower.includes("idea") ||
    lower.includes("request")
  ) {
    return LightbulbIcon;
  }
  return ChatCircleDotsIcon;
}

export function CategorySelectScreen({
  categories,
  changelogHref,
  onSelectCategory,
  roadmapHref,
}: CategorySelectScreenProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-2.5">
        {categories.map((category) => {
          const Icon = iconForCategory(category.name);
          return (
            <button
              className="group flex w-full cursor-pointer items-center gap-3 rounded-ir-card border border-ir-border bg-ir-surface px-4 py-3.5 text-left shadow-ir-xs transition-colors duration-150 ease-ir-standard hover:border-ir-primary/40 hover:bg-ir-muted-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
              key={category.id}
              onClick={() => onSelectCategory(category)}
              type="button"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-ir-full"
                style={{ backgroundColor: `${category.color}18` }}
              >
                <Icon
                  className="size-4.5"
                  style={{ color: category.color }}
                  weight="fill"
                />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ir-heading">
                {category.name}
              </span>
              <CaretRightIcon
                className="size-4 shrink-0 text-ir-muted transition-transform duration-150 ease-ir-standard group-hover:translate-x-0.5"
                style={
                  shouldReduceMotion ? { transitionDuration: "0ms" } : undefined
                }
              />
            </button>
          );
        })}
      </div>

      {(roadmapHref || changelogHref) && (
        <div className="mt-auto flex gap-2.5 border-t border-ir-border pt-4">
          {roadmapHref && (
            <Link
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-ir-sm border border-ir-border px-3 py-2 text-sm font-medium text-ir-body transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
              href={roadmapHref}
            >
              <MapTrifoldIcon className="size-4" />
              Roadmap
            </Link>
          )}
          {changelogHref && (
            <Link
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-ir-sm border border-ir-border px-3 py-2 text-sm font-medium text-ir-body transition-colors duration-150 ease-ir-standard hover:bg-ir-muted-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
              href={changelogHref}
            >
              <MegaphoneIcon className="size-4" />
              Changelog
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
