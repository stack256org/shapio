export interface ReactionGroup {
  count: number;
  emoji: string;
  hasReacted: boolean;
  reactorNames: string[];
}

// Endpoint config that lets the comment components serve more than one resource
// (feedback posts and changelog entries) without duplicating the UI. Plain
// strings only, so it can cross the server→client boundary as props. When
// omitted, components fall back to the feedback (posts) endpoints — so existing
// feedback call sites need no change.
export interface CommentApi {
  // Base path for a single comment; components append:
  //   `${commentBaseUrl}/${id}`           → PATCH (edit) / DELETE
  //   `${commentBaseUrl}/${id}/reactions` → POST (toggle reaction)
  //   `${commentBaseUrl}/${id}/approve`   → PATCH (approve)
  commentBaseUrl: string;
  // POST here to create a top-level comment or reply — body: { body, parentId? }
  createUrl: string;
}

// Default endpoints for feedback-post comments.
export function postsCommentApi(postId: string): CommentApi {
  return {
    createUrl: `/api/posts/${postId}/comments`,
    commentBaseUrl: "/api/comments",
  };
}

export interface ReplyData {
  authorAvatar: string | null;
  authorName: string | null;
  body: string;
  createdAt: string;
  id: string;
  isApproved: boolean;
  isDeleted: boolean;
  isGuest: boolean;
  isOwn: boolean;
  parentId: string | null;
  postId: string;
  reactions: ReactionGroup[];
}

export interface CommentData {
  authorAvatar: string | null;
  authorName: string | null;
  body: string;
  createdAt: string;
  id: string;
  isApproved: boolean;
  isDeleted: boolean;
  isGuest: boolean;
  isOwn: boolean;
  parentId: string | null;
  postId: string;
  reactions: ReactionGroup[];
  replies: ReplyData[];
}
