/**
 * Minimal dev seed — recreates a working workspace + owner + member + a few
 * posts + a published changelog entry, using the app's own creation code where
 * possible. Idempotent-ish: skips if the slug already exists.
 *
 *   pnpm tsx scripts/seed-dev.ts
 */
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { WORKSPACE_MEMBER } from "@/config/platform";
import {
  changelogEntries,
  posts,
  user,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import { getWorkspaceBoard } from "@/lib/boards/queries";
import { db } from "@/lib/db";
import { createWorkspace } from "@/lib/workspaces/create";

async function ensureUser(email: string, name: string): Promise<string> {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (existing) {
    return existing.id;
  }
  const id = createId();
  await db.insert(user).values({ id, email, name, emailVerified: true });
  return id;
}

async function main() {
  const slug = "acme-space";
  const [exists] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (exists) {
    console.log(
      `Workspace '${slug}' already exists (${exists.id}) — skipping.`
    );
    return;
  }

  const ownerId = await ensureUser("raj.dhokai@snapdevio.com", "Raj");
  const memberId = await ensureUser("member@example.com", "Team Member");

  const workspaceId = await createWorkspace({
    slug,
    name: "Acme Space",
    ownerId,
    ownerEmail: "raj.dhokai@snapdevio.com",
  });

  // Make roadmap + changelog public so the portal routes render.
  await db
    .update(workspaces)
    .set({ roadmapPublic: true, changelogPublic: true })
    .where(eq(workspaces.id, workspaceId));

  // A plain (non-owner) member, to test privilege boundaries.
  await db.insert(workspaceMembers).values({
    workspaceId,
    userId: memberId,
    role: WORKSPACE_MEMBER,
  });

  const board = await getWorkspaceBoard(workspaceId);
  if (!board) {
    throw new Error("default board missing");
  }

  const samplePosts = [
    { title: "Dark mode", slug: "dark-mode", status: "planned" },
    { title: "Bulk export", slug: "bulk-export", status: "in_progress" },
    { title: "Faster search", slug: "faster-search", status: "completed" },
    { title: "Mobile app", slug: "mobile-app", status: "open" },
  ];
  for (const p of samplePosts) {
    await db.insert(posts).values({
      boardId: board.id,
      workspaceId,
      slug: p.slug,
      title: p.title,
      body: `${p.title} — seeded sample feedback.`,
      status: p.status,
      authorId: ownerId,
      authorName: "Raj",
      authorEmail: "raj.dhokai@snapdevio.com",
      isApproved: true,
    });
  }

  await db.insert(changelogEntries).values({
    workspaceId,
    title: "Welcome to the changelog",
    body: "<p>Our first update.</p>",
    label: "new_feature",
    isPublished: true,
    publishedAt: new Date(),
    createdBy: ownerId,
  });

  console.log(`Seeded workspace '${slug}' (${workspaceId})`);
  console.log("  owner:  raj.dhokai@snapdevio.com");
  console.log("  member: member@example.com");
  console.log(`  board:  ${board.slug}, 4 posts, 1 published changelog entry`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
