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
import { type CommentApi, postsCommentApi, type ReplyData } from "./types";
import { uploadCommentImage } from "./upload-comment-image";

const QuillEditor = dynamic(() => import("./quill-editor"), { ssr: false });

interface CommentReplyFormProps {
  api?: CommentApi;
  isSignedIn: boolean;
  onCancel: () => void;
  onSuccess: (reply: ReplyData) => void;
  parentId: string;
  postId: string;
}

export default function CommentReplyForm({
  postId,
  api,
  parentId,
  isSignedIn,
  onSuccess,
  onCancel,
}: CommentReplyFormProps) {
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
    if (countCharacters(currentText) === 0 || isPending || uploading) {
      return;
    }
    if (countCharacters(currentText) > MAX) {
      setError(`Reply must be ${MAX.toLocaleString()} characters or fewer.`);
      return;
    }
    setError(null);
    setPendingMessage(null);
    setIsPending(true);

    try {
      const res = await embedFetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: currentHtml,
          parentId,
        }),
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
        setPendingMessage("Your reply is pending review by an admin.");
        resetEditor();
        return;
      }

      resetEditor();
      onSuccess({
        ...data,
        createdAt: new Date(data.createdAt).toISOString(),
        reactions: [],
      });
      onCancel();
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
        <p className="mt-3 ml-10 py-2 text-sm text-ir-muted">
          <button
            className="cursor-pointer rounded-ir-xs font-medium text-ir-primary transition-opacity duration-150 ease-ir-standard hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
            onClick={() => setAuthOpen(true)}
            type="button"
          >
            {isEmbed ? "Sign in" : "Verify your email"}
          </button>{" "}
          to reply.{" "}
          <button
            className="cursor-pointer text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
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
    <form className="mt-3 ml-10 space-y-2" onSubmit={handleSubmit}>
      <QuillEditor
        ariaLabel="Reply"
        disabled={isPending}
        key={editorKey}
        maxHeight={320}
        minHeight={64}
        onChange={handleChange}
        onSubmit={submit}
        onUploadingChange={setUploading}
        placeholder="Write a reply…  (Enter to reply, Shift+Enter for a new line)"
        uploadImage={uploadCommentImage}
        value={html}
      />

      {error && <p className="text-xs text-ir-danger">{error}</p>}
      {pendingMessage && (
        <p className="text-xs text-ir-warning">{pendingMessage}</p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          disabled={isPending}
          onClick={onCancel}
          size="sm"
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          disabled={isPending || uploading || countCharacters(text) === 0}
          size="sm"
          type="submit"
        >
          {isPending ? "Posting…" : "Reply"}
        </Button>
      </div>
    </form>
  );
}
