import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { RESERVED_SLUGS } from "@/config/platform";
import { workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const SLUG_MIN = 2;
export const SLUG_MAX = 48;
const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export function isSlugReserved(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug);
}

export function validateSlugFormat(slug: string): string | null {
  if (slug.length < SLUG_MIN) {
    return `Must be at least ${SLUG_MIN} characters.`;
  }
  if (slug.length > SLUG_MAX) {
    return `Must be ${SLUG_MAX} characters or fewer.`;
  }
  if (!SLUG_REGEX.test(slug)) {
    return "Only lowercase letters, numbers, and hyphens. Must start and end with a letter or number.";
  }
  if (slug.includes("--")) {
    return "Cannot contain consecutive hyphens.";
  }
  return null;
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const [row] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  return !row;
}

export async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "workspace";

  if (!isSlugReserved(base) && (await isSlugAvailable(base))) {
    return base;
  }

  for (let i = 0; i < 8; i++) {
    const suffix = createId().slice(0, 4);
    const candidate = `${base.slice(0, 43)}-${suffix}`;
    if (await isSlugAvailable(candidate)) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique workspace slug.");
}
