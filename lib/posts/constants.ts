export type PostStatus =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed";

export const POST_STATUSES: PostStatus[] = [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "completed",
  "closed",
];

// Server-side guard against a hand-edited ?pageSize= outside anything the
// "Rows per page" select actually offers (e.g. ?pageSize=999999). Lives here
// (not in the "use client" posts-pagination-bar component) so Server
// Component pages can import it too — a plain constant exported from a
// "use client" module resolves to undefined across the server/client
// boundary, not its actual value.
export const MIN_PAGE_SIZE = 1;
export const MAX_PAGE_SIZE = 100;
