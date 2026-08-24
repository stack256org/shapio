import { createId } from "@paralleldrive/cuid2";
import { posts } from "@/db/schema/posts";
import { votes } from "@/db/schema/votes";
import { getWorkspaceBoard } from "@/lib/boards/queries";
import { db } from "@/lib/db";
import { generatePostSlug } from "@/lib/posts/queries";

// A single welcome-style example post dropped into every brand-new
// workspace (mirrors Upvoty's own single "Welcome" example post) so the
// default board isn't completely empty on first visit. Called once, right
// after workspace creation — there is no other path that creates a
// workspace, so this can never run twice against the same workspace and
// never touches an existing one.
const WELCOME_POST = {
  title: "Welcome to your feedback board 👋",
  body: "This is an example piece of feedback — this is what a real customer's feature request or bug report will look like here. Feel free to delete it once you're ready to launch.",
  authorEmail: "hello@shapio.app",
  authorName: "Shapio",
  upvotes: 3,
};

export async function seedWorkspaceDemoContent(
  workspaceId: string
): Promise<void> {
  const board = await getWorkspaceBoard(workspaceId);
  if (!board) {
    return;
  }

  const slug = await generatePostSlug(board.id, WELCOME_POST.title);
  const postId = createId();

  await db.insert(posts).values({
    id: postId,
    boardId: board.id,
    workspaceId,
    slug,
    title: WELCOME_POST.title,
    body: WELCOME_POST.body,
    authorName: WELCOME_POST.authorName,
    authorEmail: WELCOME_POST.authorEmail,
    upvotes: WELCOME_POST.upvotes,
    isApproved: true,
  });

  if (WELCOME_POST.upvotes > 0) {
    await db.insert(votes).values(
      Array.from({ length: WELCOME_POST.upvotes }, (_, i) => ({
        postId,
        workspaceId,
        userEmail: `demo-voter-${i + 1}@example.com`,
        userName: `Demo Voter ${i + 1}`,
      }))
    );
  }
}
