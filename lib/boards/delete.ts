import { eq } from "drizzle-orm";
import { boards } from "@/db/schema";
import { db } from "@/lib/db";

/**
 * Permanently delete a board. The `posts.board_id` foreign key cascades, which
 * in turn cascades each post's votes and comments — so removing the board row
 * removes all of its feedback, votes, and comments.
 */
export async function deleteBoard(boardId: string) {
  await db.delete(boards).where(eq(boards.id, boardId));
}
