"use client";

import { CheckIcon, LinkIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

interface ChangelogShareButtonProps {
  title: string;
  url: string;
}

export function ChangelogShareButton({
  title,
  url,
}: ChangelogShareButtonProps) {
  const [copied, setCopied] = useState(false);
  // Starts false to match server-rendered output (there's no `navigator` on
  // the server) — the real capability is only knowable client-side, so it's
  // detected in an effect after mount instead of during render. Checking it
  // inline here would make the very first client render disagree with the
  // server's on any browser that does support the Web Share API.
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator.share === "function");
  }, []);

  async function handleClick() {
    if (canNativeShare) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to copy.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied — nothing further we can do.
    }
  }

  return (
    <button
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-ir-sm border border-ir-border px-3 py-1.5 text-xs font-medium text-ir-muted transition-colors duration-150 ease-ir-standard hover:border-ir-primary/30 hover:text-ir-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
      onClick={handleClick}
      type="button"
    >
      {copied ? (
        <>
          <CheckIcon className="size-3.5 text-ir-success" />
          Copied
        </>
      ) : canNativeShare ? (
        <>
          <ShareNetworkIcon className="size-3.5" />
          Share
        </>
      ) : (
        <>
          <LinkIcon className="size-3.5" />
          Copy link
        </>
      )}
    </button>
  );
}
