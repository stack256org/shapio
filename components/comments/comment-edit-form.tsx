"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { truncateHtmlToText } from "@/lib/changelog/html";
import { embedFetch } from "@/lib/embed/fetch";
import type { CommentApi } from "./types";
import { uploadCommentImage } from "./upload-comment-image";

const QuillEditor = dynamic(() => import("./quill-editor"), { ssr: false });

interface CommentEditFormProps {
  api?: CommentApi;
  commentId: string;
  initialBody: string;
  onCancel: () => void;
  onSaved: (newBody: string) => void;
}

// Inline editor for an existing comment. Reuses the shared Quill editor (image
// upload + Enter-to-save) and the comment API — only the author can edit, which
// the PATCH route enforces.
export default function CommentEditForm({
  api,
  commentId,
  initialBody,
  onSaved,
  onCancel,
}: CommentEditFormProps) {
  const commentBaseUrl = api?.commentBaseUrl ?? "/api/comments";
  const [html, setHtml] = useState(initialBody);
  // Seed the text length from the existing body so an unchanged comment is still
  // valid to save (the editor only emits onChange after a user edit).
  const [text, setText] = useState(() =>
    truncateHtmlToText(initialBody, 100_000)
  );
  const [isPending, setIsPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const htmlRef = useRef(initialBody);
  const textRef = useRef(truncateHtmlToText(initialBody, 100_000));

  const MAX = 5000;

  function handleChange(newHtml: string, newText: string) {
    setHtml(newHtml);
    setText(newText);
    htmlRef.current = newHtml;
    textRef.current = newText;
    if (error) {
      setError(null);
    }
  }

  async function submit() {
    const currentText = textRef.current;
    const currentHtml = htmlRef.current;
    if (!currentText.trim() || isPending || uploading) {
      return;
    }
    if (currentText.length > MAX) {
      setError(`Comment must be ${MAX.toLocaleString()} characters or fewer.`);
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      const res = await embedFetch(`${commentBaseUrl}/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: currentHtml }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      onSaved(currentHtml);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mt-1 space-y-2">
      <QuillEditor
        disabled={isPending}
        minHeight={72}
        onChange={handleChange}
        onSubmit={submit}
        onUploadingChange={setUploading}
        placeholder="Edit your comment…  (Enter to save, Shift+Enter for a new line)"
        uploadImage={uploadCommentImage}
        value={html}
      />

      {error && <p className="text-xs text-ir-danger">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Button
          disabled={isPending}
          onClick={onCancel}
          size="sm"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          disabled={isPending || uploading || !text.trim()}
          onClick={submit}
          size="sm"
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
