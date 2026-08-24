import { existsSync } from "node:fs";
import { asc } from "drizzle-orm";

if (existsSync(".env")) {
  process.loadEnvFile();
}

// One-off migration: Shapio now supports exactly one board per workspace.
// For any workspace that still has more than one (from before this change),
// keep the oldest board and delete the rest. Deleting a board cascades to its
// posts, which cascades to their votes and comments — so this also removes
// all feedback that lived only on the deleted boards. Idempotent: a workspace
// with a single board is a no-op, so it's safe to re-run.
async function main() {
  const [{ db }, { boards }, { deleteBoard }] = await Promise.all([
    import("@/lib/db"),
    import("@/db/schema"),
    import("@/lib/boards/delete"),
  ]);

  const allBoards = await db
    .select({
      id: boards.id,
      workspaceId: boards.workspaceId,
      name: boards.name,
    })
    .from(boards)
    .orderBy(asc(boards.createdAt));

  const byWorkspace = new Map<string, typeof allBoards>();
  for (const board of allBoards) {
    const list = byWorkspace.get(board.workspaceId) ?? [];
    list.push(board);
    byWorkspace.set(board.workspaceId, list);
  }

  let workspacesAffected = 0;
  let boardsRemoved = 0;

  for (const [workspaceId, workspaceBoards] of byWorkspace) {
    if (workspaceBoards.length <= 1) {
      continue;
    }

    const [kept, ...extras] = workspaceBoards;
    workspacesAffected++;

    for (const extra of extras) {
      await deleteBoard(extra.id);
      boardsRemoved++;
      console.log(
        `[collapse-boards] workspace ${workspaceId}: deleted board "${extra.name}" (${extra.id}), kept "${kept.name}" (${kept.id})`
      );
    }
  }

  console.log(
    `[collapse-boards] done — ${workspacesAffected} workspace(s) affected, ${boardsRemoved} board(s) removed.`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
