"use client";

import { XIcon } from "@phosphor-icons/react";
import "quill/dist/quill.snow.css";
import { useEffect, useRef, useState } from "react";

type QuillInstance = InstanceType<typeof import("quill").default>;

// Quill's snow theme renders its own toolbar buttons with no accessible name
// or hover label. Keyed by the CSS selector Quill gives each button so a
// plain lookup + setAttribute covers all of them. `data-tooltip` drives the
// CSS-only tooltip in globals.css (styled to match the app's Tooltip
// component); native `title` tooltips are OS-styled and have a ~1s hover
// delay, which reads as "not working" next to the rest of the app's instant,
// on-brand tooltips.
const TOOLBAR_TOOLTIPS: Record<string, string> = {
  ".ql-bold": "Bold",
  ".ql-italic": "Italic",
  ".ql-underline": "Underline",
  ".ql-strike": "Strikethrough",
  ".ql-blockquote": "Quote",
  ".ql-code-block": "Code block",
  ".ql-list[value='ordered']": "Numbered list",
  ".ql-list[value='bullet']": "Bulleted list",
  '.ql-indent[value="-1"]': "Decrease indent",
  '.ql-indent[value="+1"]': "Increase indent",
  ".ql-link": "Link",
  ".ql-image": "Insert image",
};

function applyToolbarTooltips(toolbarEl: HTMLElement) {
  for (const [selector, label] of Object.entries(TOOLBAR_TOOLTIPS)) {
    const button = toolbarEl.querySelector(selector);
    button?.setAttribute("aria-label", label);
    button?.setAttribute("data-tooltip", label);
  }
}

const LINK_ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
// A bare domain like "example.com" (no scheme) — required before we'll treat
// schemeless input as a link rather than plain garbage text. Quill's own
// sanitizer resolves a scheme-less string against the current page and
// happily accepts it as a (broken) relative link otherwise.
const BARE_DOMAIN_PATTERN = /^[\w-]+(\.[\w-]+)+(:\d+)?([/?#]\S*)?$/;

// Validates (and normalizes) a URL typed into Quill's link tooltip. Returns
// the URL to insert, or null if it doesn't look like a real link.
function normalizeLinkUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    return LINK_ALLOWED_PROTOCOLS.has(url.protocol) ? trimmed : null;
  } catch {
    if (!BARE_DOMAIN_PATTERN.test(trimmed)) {
      return null;
    }
    try {
      return new URL(`https://${trimmed}`).href;
    } catch {
      return null;
    }
  }
}

interface QuillLinkTooltip {
  edit: (mode?: string, preview?: string | null) => void;
  root: HTMLElement;
  save: () => void;
  textbox: HTMLInputElement;
}

// Quill's own link tooltip accepts any typed text as-is (see
// normalizeLinkUrl's comment above) — pressing Enter goes straight to the
// tooltip's internal save(), bypassing the toolbar's `handlers.link` option
// entirely. Wrapping save()/edit() on the live tooltip instance is the only
// way to validate before insertion while keeping Quill's built-in floating
// input UX (position, prefill-on-edit, etc.) intact.
function installLinkValidation(quill: QuillInstance) {
  const tooltip = (quill.theme as unknown as { tooltip?: QuillLinkTooltip })
    .tooltip;
  if (!tooltip) {
    return;
  }

  const originalSave = tooltip.save.bind(tooltip);
  tooltip.save = () => {
    if (tooltip.root.getAttribute("data-mode") !== "link") {
      originalSave();
      return;
    }
    const normalized = normalizeLinkUrl(tooltip.textbox.value);
    if (!normalized) {
      tooltip.root.classList.add("ql-link-invalid");
      tooltip.textbox.select();
      return;
    }
    tooltip.root.classList.remove("ql-link-invalid");
    tooltip.textbox.value = normalized;
    originalSave();
  };

  const originalEdit = tooltip.edit.bind(tooltip);
  tooltip.edit = (mode, preview) => {
    tooltip.root.classList.remove("ql-link-invalid");
    originalEdit(mode, preview);
  };

  tooltip.textbox.addEventListener("input", () => {
    tooltip.root.classList.remove("ql-link-invalid");
  });
}

interface HoveredImage {
  img: HTMLImageElement;
  left: number;
  top: number;
  width: number;
}

interface QuillEditorProps {
  // Accessible name for the underlying contenteditable — placeholder text
  // alone isn't a reliable accessible name for screen readers.
  ariaLabel?: string;
  disabled?: boolean;
  maxHeight?: number;
  minHeight?: number;
  onChange: (html: string, text: string) => void;
  // Opt-in: when provided, pressing Enter (without Shift) calls this instead of
  // inserting a newline. Shift+Enter still inserts a newline. Used by comments.
  onSubmit?: () => void;
  // Opt-in: enables the image toolbar button + drag&drop + paste. Receives a
  // file and returns the hosted URL (or null on failure). Reuses the caller's
  // upload/storage logic — the editor only inserts the returned URL.
  onUploadingChange?: (uploading: boolean) => void;
  placeholder?: string;
  uploadImage?: (file: File) => Promise<string | null>;
  value: string;
}

export default function QuillEditor({
  value,
  onChange,
  onSubmit,
  uploadImage,
  onUploadingChange,
  placeholder = "Write something…",
  disabled = false,
  minHeight = 80,
  maxHeight,
  ariaLabel,
}: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<QuillInstance | null>(null);
  const removeButtonRef = useRef<HTMLButtonElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const ariaLabelRef = useRef(ariaLabel);
  ariaLabelRef.current = ariaLabel;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const uploadImageRef = useRef(uploadImage);
  uploadImageRef.current = uploadImage;
  const onUploadingChangeRef = useRef(onUploadingChange);
  onUploadingChangeRef.current = onUploadingChange;

  const [uploadingCount, setUploadingCount] = useState(0);
  // Purely a UI affordance — never touches quill.root, so it can never leak
  // into the saved HTML. Removing the image is a direct DOM removal, which
  // Quill's own MutationObserver picks up (same path native spellcheck edits
  // take), so the existing text-change → onChange wiring fires normally.
  const [hoveredImage, setHoveredImage] = useState<HoveredImage | null>(null);

  function showImageOverlay(img: HTMLImageElement) {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    setHoveredImage({
      img,
      top: imgRect.top - containerRect.top,
      left: imgRect.left - containerRect.left,
      width: imgRect.width,
    });
  }

  function hideImageOverlay() {
    setHoveredImage(null);
  }

  function handleRemoveHoveredImage() {
    hoveredImage?.img.remove();
    quillRef.current?.update("user");
    setHoveredImage(null);
  }

  // Upload a file through the caller's uploader and insert it at the cursor.
  async function uploadAndInsert(quill: QuillInstance, file: File) {
    const upload = uploadImageRef.current;
    if (!upload) {
      return;
    }
    setUploadingCount((c) => {
      if (c === 0) {
        onUploadingChangeRef.current?.(true);
      }
      return c + 1;
    });
    try {
      const url = await upload(file);
      if (url) {
        const range = quill.getSelection(true) ?? { index: quill.getLength() };
        quill.insertEmbed(range.index, "image", url, "user");
        quill.setSelection(range.index + 1, 0, "user");
      }
    } finally {
      setUploadingCount((c) => {
        const next = Math.max(0, c - 1);
        if (next === 0) {
          onUploadingChangeRef.current?.(false);
        }
        return next;
      });
    }
  }

  function pickAndUpload(quill: QuillInstance) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif";
    input.multiple = true;
    input.onchange = () => {
      for (const file of Array.from(input.files ?? [])) {
        uploadAndInsert(quill, file);
      }
    };
    input.click();
  }

  // Quill is initialized exactly once on mount; latest props/callbacks are read via refs.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only init
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    // Fresh inner div each mount so Strict Mode's double-mount can't reuse a div
    // that already has Quill's DOM on it.
    const editorDiv = document.createElement("div");
    wrapper.appendChild(editorDiv);
    const cleanups: (() => void)[] = [];

    // Catch-all: if the pointer leaves the whole editor (e.g. a fast flick
    // off-screen skips the img's own mouseout), make sure the overlay
    // doesn't get stuck visible.
    const container = containerRef.current;
    if (container) {
      container.addEventListener("mouseleave", hideImageOverlay);
      cleanups.push(() =>
        container.removeEventListener("mouseleave", hideImageOverlay)
      );
    }

    import("quill").then(({ default: Quill }) => {
      if (!document.contains(editorDiv) || quillRef.current) {
        return;
      }

      const withImages = !!uploadImageRef.current;
      // No "clean" (clear formatting) — not part of our editor requirements.
      // Everything else stays, including the list buttons.
      const toolbarContainer = [
        ["bold", "italic", "underline", "strike"],
        ["blockquote", "code-block"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ indent: "-1" }, { indent: "+1" }],
        ["link"],
        ...(withImages ? [["image"]] : []),
      ];

      const quill = new Quill(editorDiv, {
        theme: "snow",
        placeholder,
        modules: {
          toolbar: {
            container: toolbarContainer,
            handlers: withImages ? { image: () => pickAndUpload(quill) } : {},
          },
        },
      });

      quillRef.current = quill;
      quill.root.setAttribute("role", "textbox");
      if (ariaLabelRef.current) {
        quill.root.setAttribute("aria-label", ariaLabelRef.current);
      }

      const toolbarEl = wrapper.querySelector<HTMLElement>(".ql-toolbar");
      if (toolbarEl) {
        applyToolbarTooltips(toolbarEl);
      }
      installLinkValidation(quill);

      if (value && value !== "<p><br></p>") {
        quill.root.innerHTML = value;
      }

      quill.on("text-change", () => {
        const html = quill.root.innerHTML;
        const text = quill.getText().trim();
        onChangeRef.current(html === "<p><br></p>" ? "" : html, text);
      });

      if (disabled) {
        quill.disable();
      }

      // Quill's own toolbar module only re-syncs its .ql-active button state
      // on the EDITOR_CHANGE event — but quill.format() (what Ctrl/Cmd+B/I/U
      // call under the hood) never emits that event when the selection is
      // collapsed. See quill/core/quill.js: `modify()` only emits when the
      // resulting change Delta is non-empty, and toggling a format with
      // nothing selected produces an empty Delta by design — it just marks
      // the pending format for the next typed character rather than editing
      // existing text. So placing the cursor and pressing Ctrl+B leaves the
      // toolbar showing the old state until some unrelated event (typing,
      // moving the cursor) happens to fire EDITOR_CHANGE for its own reason.
      // Force a resync right after the shortcut instead of waiting for that.
      // Harmless (and cheap — a native classList read/write, not a React
      // re-render) even when the selection wasn't collapsed, where Quill's
      // own listener already handled it correctly.
      const onFormatShortcut = (e: KeyboardEvent) => {
        if (!(e.ctrlKey || e.metaKey)) {
          return;
        }
        if (!["b", "i", "u"].includes(e.key.toLowerCase())) {
          return;
        }
        const toolbar = quill.getModule("toolbar") as {
          update: (range: { index: number; length: number } | null) => void;
        } | null;
        toolbar?.update(quill.getSelection());
      };
      quill.root.addEventListener("keyup", onFormatShortcut);
      cleanups.push(() =>
        quill.root.removeEventListener("keyup", onFormatShortcut)
      );

      // Enter-to-submit: capture phase so we beat Quill's own newline handler.
      // Shift+Enter (and IME composition) fall through to the default newline.
      // Inside a list, Enter is left alone entirely — Quill's own default
      // handling creates the next item, or exits the list on an empty item,
      // exactly as it does in every other QuillEditor that has no onSubmit
      // (e.g. the changelog editor) — only outside of a list does Enter submit.
      if (onSubmitRef.current) {
        const onKeyDown = (e: KeyboardEvent) => {
          if (e.key !== "Enter" || e.shiftKey || e.isComposing) {
            return;
          }
          const range = quill.getSelection();
          if (range && quill.getFormat(range.index).list) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          onSubmitRef.current?.();
        };
        quill.root.addEventListener("keydown", onKeyDown, true);
        cleanups.push(() =>
          quill.root.removeEventListener("keydown", onKeyDown, true)
        );
      }

      // Drag & drop + paste of images.
      if (withImages) {
        const imageFiles = (list?: FileList | null) =>
          Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));

        const onDrop = (e: DragEvent) => {
          const files = imageFiles(e.dataTransfer?.files);
          if (files.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            for (const file of files) {
              uploadAndInsert(quill, file);
            }
          }
        };
        const onPaste = (e: ClipboardEvent) => {
          const files = imageFiles(e.clipboardData?.files);
          if (files.length > 0) {
            e.preventDefault();
            for (const file of files) {
              uploadAndInsert(quill, file);
            }
          }
        };
        quill.root.addEventListener("drop", onDrop, true);
        quill.root.addEventListener("paste", onPaste, true);
        cleanups.push(() => {
          quill.root.removeEventListener("drop", onDrop, true);
          quill.root.removeEventListener("paste", onPaste, true);
        });
      }

      // Hover-to-remove: show a small remove button over any image on
      // hover, instead of requiring backspace to select and delete it.
      const onMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === "IMG") {
          showImageOverlay(target as HTMLImageElement);
        }
      };
      const onMouseOut = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== "IMG") {
          return;
        }
        const to = e.relatedTarget as Node | null;
        // Moving onto the remove button itself keeps it visible.
        if (to && removeButtonRef.current?.contains(to)) {
          return;
        }
        hideImageOverlay();
      };
      quill.root.addEventListener("mouseover", onMouseOver);
      quill.root.addEventListener("mouseout", onMouseOut);
      cleanups.push(() => {
        quill.root.removeEventListener("mouseover", onMouseOver);
        quill.root.removeEventListener("mouseout", onMouseOut);
      });
    });

    return () => {
      quillRef.current = null;
      for (const fn of cleanups) {
        fn();
      }
      wrapper.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync disabled state after init.
  useEffect(() => {
    if (!quillRef.current) {
      return;
    }
    if (disabled) {
      quillRef.current.disable();
    } else {
      quillRef.current.enable();
    }
  }, [disabled]);

  return (
    <div
      className="relative rounded-ir-input border border-ir-border bg-ir-surface focus-within:border-ir-primary focus-within:ring-2 focus-within:ring-ir-primary/20"
      ref={containerRef}
      style={{
        ["--ql-min-height" as string]: `${minHeight}px`,
        ["--ql-max-height" as string]: maxHeight ? `${maxHeight}px` : "none",
      }}
    >
      <div
        className={disabled ? "pointer-events-none opacity-50" : ""}
        ref={wrapperRef}
      />
      {uploadingCount > 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-ir-input bg-ir-surface/60 text-xs font-medium text-ir-muted">
          Uploading image…
        </div>
      )}
      {hoveredImage && !disabled && (
        <button
          aria-label="Remove image"
          className="absolute flex size-6 cursor-pointer items-center justify-center rounded-ir-full bg-ir-heading/70 text-ir-primary-foreground shadow-ir-sm transition-colors duration-150 ease-ir-standard hover:bg-ir-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
          onClick={handleRemoveHoveredImage}
          onMouseLeave={(e) => {
            if (e.relatedTarget === hoveredImage.img) {
              return;
            }
            hideImageOverlay();
          }}
          ref={removeButtonRef}
          style={{
            top: hoveredImage.top + 6,
            left: hoveredImage.left + hoveredImage.width - 30,
          }}
          type="button"
        >
          <XIcon className="size-3.5" weight="bold" />
        </button>
      )}
    </div>
  );
}
