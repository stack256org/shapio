"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { EmbedAuthDialog } from "@/components/embed/embed-auth-dialog";
import { useIsEmbed } from "@/components/embed/use-is-embed";
import { PortalVerifyDialog } from "@/components/portal/portal-verify-dialog";
import { Button } from "@/components/ui/button";
import { embedFetch } from "@/lib/embed/fetch";
import { useEmbedSignedIn } from "@/lib/embed/use-embed-signed-in";
import { countCharacters } from "@/lib/text-metrics";
import { type CommentApi, type CommentData, postsCommentApi } from "./types";
import { uploadCommentImage } from "./upload-comment-image";

const QuillEditor = dynamic(() => import("./quill-editor"), { ssr: false });

interface CommentFormProps {
  api?: CommentApi;
  isLocked: boolean;
  isSignedIn: boolean;
  onSuccess: (comment: CommentData) => void;
  postId: string;
}

export default function CommentForm({
  postId,
  api,
  isSignedIn,
  isLocked,
  onSuccess,
}: CommentFormProps) {
  const createUrl = (api ?? postsCommentApi(postId)).createUrl;
  const router = useRouter();
  const isEmbed = useIsEmbed();
  const [html, setHtml] = useState("");
  const [text, setText] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useEmbedSignedIn(isEmbed, isSignedIn);
  const [authOpen, setAuthOpen] = useState(false);

  // Mirrors of the latest content so the Enter-to-submit handler always reads
  // the current value (not a stale render's state).
  const htmlRef = useRef("");
  const textRef = useRef("");

  const MAX = 5000;

  function handleChange(newHtml: string, newText: string) {
    setHtml(newHtml);
    setText(newText);
    htmlRef.current = newHtml;
    textRef.current = newText;
    if (error) {
      setError(null);
    }
    if (pendingMessage) {
      setPendingMessage(null);
    }
  }

  function resetEditor() {
    setEditorKey((k) => k + 1);
    setHtml("");
    setText("");
    htmlRef.current = "";
    textRef.current = "";
  }

  async function submit() {
    const currentText = textRef.current;
    const currentHtml = htmlRef.current;
    // Validation + duplicate-submit / mid-upload guards.
    if (countCharacters(currentText) === 0 || isPending || uploading) {
      return;
    }
    if (countCharacters(currentText) > MAX) {
      setError(`Comment must be ${MAX.toLocaleString()} characters or fewer.`);
      return;
    }
    setError(null);
    setPendingMessage(null);
    setIsPending(true);

    try {
      const res = await embedFetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: currentHtml }),
      });

      const data = await res.json();

      if (!res.ok) {
        // A session can go stale between page load and this submit (expiry,
        // a sign-out elsewhere). Reopen the in-place prompt instead of
        // leaving the visitor stuck behind a generic error — the draft stays
        // intact (it's tracked in refs/state, not reset here) and resubmits
        // automatically once they're signed in again.
        if (res.status === 401) {
          setSignedIn(false);
          setAuthOpen(true);
          return;
        }
        setError(data.error ?? "Something went wrong.");
        return;
      }

      if (!data.isApproved) {
        setPendingMessage("Your comment is pending review by an admin.");
        resetEditor();
        return;
      }

      onSuccess({
        ...data,
        createdAt: new Date(data.createdAt).toISOString(),
        reactions: [],
        replies: [],
      });
      resetEditor();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  if (isLocked) {
    return (
      <p className="py-2 text-xs text-ir-muted">
        Comments are closed on this post.
      </p>
    );
  }

  if (!signedIn) {
    // No-ops if the box was empty (a manual prompt); resubmits the draft
    // automatically if this reopened after a 401 mid-submit.
    const handleAuthenticated = () => {
      setSignedIn(true);
      router.refresh();
      submit();
    };

    return (
      <>
        <p className="py-2 text-sm text-ir-muted">
          <button
            className="cursor-pointer rounded-ir-xs font-medium text-ir-primary transition-opacity duration-150 ease-ir-standard hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
            onClick={() => setAuthOpen(true)}
            type="button"
          >
            {isEmbed ? "Sign in" : "Verify your email"}
          </button>{" "}
          to join the conversation.
        </p>
        {isEmbed ? (
          <EmbedAuthDialog
            onAuthenticated={handleAuthenticated}
            onOpenChange={setAuthOpen}
            open={authOpen}
          />
        ) : (
          <PortalVerifyDialog
            action="comment"
            onOpenChange={setAuthOpen}
            onVerified={handleAuthenticated}
            open={authOpen}
          />
        )}
      </>
    );
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <QuillEditor
        ariaLabel="Comment"
        disabled={isPending}
        key={editorKey}
        maxHeight={320}
        minHeight={64}
        onChange={handleChange}
        onSubmit={submit}
        onUploadingChange={setUploading}
        placeholder="Leave a comment…  (Enter to post, Shift+Enter for a new line)"
        uploadImage={uploadCommentImage}
        value={html}
      />

      {error && <p className="text-xs text-ir-danger">{error}</p>}
      {pendingMessage && (
        <p className="text-xs text-ir-warning">{pendingMessage}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-ir-muted">
          {countCharacters(text) > 0
            ? `${(MAX - countCharacters(text)).toLocaleString()} characters remaining`
            : ""}
        </span>
        <Button
          disabled={isPending || uploading || countCharacters(text) === 0}
          size="sm"
          type="submit"
        >
          {isPending ? "Posting…" : "Post comment"}
        </Button>
      </div>
    </form>
  );
}
