"use client";

import { CheckIcon, CopyIcon, SpinnerIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createInviteLinkAction } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateLinkFormProps {
  appUrl: string;
  canCreateAdmin: boolean;
  workspaceId: string;
}

export function CreateLinkForm({
  workspaceId,
  appUrl,
  canCreateAdmin,
}: CreateLinkFormProps) {
  const router = useRouter();
  const [role, setRole] = useState<"member" | "admin">("member");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedUrl(null);
    setSubmitting(true);

    const result = await createInviteLinkAction({
      workspaceId,
      role,
      label: label.trim() || undefined,
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    const url = `${appUrl}/invite/link/${result.data.token}`;
    setCreatedUrl(url);
    setLabel("");
    setRole("member");
    router.refresh();
  }

  async function copyUrl() {
    if (!createdUrl) {
      return;
    }
    await navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold tracking-eyebrow text-ir-muted uppercase">
        Generate invite link
      </h3>
      <form className="flex flex-wrap gap-3" onSubmit={onSubmit}>
        {error && (
          <p className="w-full rounded-ir-sm bg-ir-danger/10 px-3 py-2 text-sm text-ir-danger">
            {error}
          </p>
        )}
        <Input
          className="w-48"
          disabled={submitting}
          maxLength={100}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          type="text"
          value={label}
        />
        {canCreateAdmin && (
          <Select
            disabled={submitting}
            onValueChange={(v) => setRole(v as "member" | "admin")}
            value={role}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Team Member</SelectItem>
              <SelectItem value="admin">Brand Admin</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Button disabled={submitting} type="submit">
          {submitting ? (
            <>
              <SpinnerIcon
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
              Generating…
            </>
          ) : (
            "Generate link"
          )}
        </Button>
      </form>
      {createdUrl && (
        <div className="flex items-center gap-2 rounded-ir-sm border border-ir-border bg-ir-muted-surface px-4 py-3">
          <p className="min-w-0 flex-1 truncate font-mono text-xs text-ir-heading">
            {createdUrl}
          </p>
          <Button
            className="shrink-0"
            onClick={copyUrl}
            size="sm"
            variant="outline"
          >
            {copied ? (
              <>
                <CheckIcon
                  className="size-3.5 text-ir-success"
                  data-icon="inline-start"
                />
                Copied
              </>
            ) : (
              <>
                <CopyIcon className="size-3.5" data-icon="inline-start" />
                Copy
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
