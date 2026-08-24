"use client";

import { SpinnerIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { inviteMemberAction } from "@/app/actions/members";
import { Callout } from "@/components/settings/integrations/callout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { suggestEmailDomainFix } from "@/lib/email-typo";

interface InviteFormProps {
  canInviteAdmin: boolean;
  isOrbitAdmin: boolean;
  onInvited?: () => void;
  // Hide the built-in eyebrow heading when the form is embedded somewhere
  // that already provides its own title (e.g. a dialog's DialogTitle).
  showHeading?: boolean;
  smtpConfigured: boolean;
  workspaceId: string;
}

export function InviteForm({
  workspaceId,
  canInviteAdmin,
  isOrbitAdmin,
  showHeading = true,
  smtpConfigured,
  onInvited,
}: InviteFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [emailSuggestionDismissed, setEmailSuggestionDismissed] =
    useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setGeneralError(null);

    const trimmedEmail = email.trim();

    // An unacknowledged typo suggestion blocks the invite until the admin
    // either accepts the fix or explicitly confirms the domain as typed —
    // otherwise a mistyped domain (e.g. "gmil.com") would silently invite
    // an address nobody can ever accept.
    const domainFix = suggestEmailDomainFix(trimmedEmail);
    if (domainFix && !emailSuggestionDismissed) {
      setEmailSuggestion(domainFix);
      return;
    }

    setSubmitting(true);
    const result = await inviteMemberAction({
      workspaceId,
      email: trimmedEmail,
      role,
    });
    setSubmitting(false);

    if (!result.success) {
      if (result.field === "email") {
        setEmailError(result.error);
      } else {
        setGeneralError(result.error);
      }
      return;
    }

    toast.success(`Invitation sent to ${trimmedEmail}`);
    setEmail("");
    setRole("member");
    setEmailSuggestion(null);
    setEmailSuggestionDismissed(false);
    router.refresh();
    onInvited?.();
  }

  function acceptEmailSuggestion() {
    if (!emailSuggestion) {
      return;
    }
    setEmail(emailSuggestion);
    setEmailSuggestion(null);
  }

  function dismissEmailSuggestion() {
    setEmailSuggestionDismissed(true);
    setEmailSuggestion(null);
  }

  return (
    <div>
      {showHeading && (
        <h2 className="mb-4 text-sm font-semibold tracking-eyebrow text-ir-muted uppercase">
          Invite a Team Member
        </h2>
      )}
      {!smtpConfigured && (
        <Callout className="mb-4" variant="warning">
          Email isn&apos;t configured, so invites can&apos;t be delivered yet.
          {isOrbitAdmin ? (
            <>
              {" "}
              <Link href="/orbit/integrations">
                Set up SMTP in Integrations →
              </Link>
            </>
          ) : (
            " Ask your platform administrator to set up SMTP."
          )}
        </Callout>
      )}
      <form className="space-y-4" onSubmit={onSubmit}>
        {generalError && (
          <p className="rounded-ir-sm bg-ir-danger/10 px-3 py-2 text-sm text-ir-danger">
            {generalError}
          </p>
        )}
        <div className="space-y-1">
          <Input
            autoComplete="off"
            disabled={submitting}
            onChange={(e) => {
              const value = e.target.value;
              setEmail(value);
              setEmailError(null);
              setEmailSuggestion(suggestEmailDomainFix(value));
              setEmailSuggestionDismissed(false);
            }}
            placeholder="colleague@example.com"
            type="email"
            value={email}
          />
          {emailError && <p className="text-xs text-ir-danger">{emailError}</p>}
          {emailSuggestion && (
            <div className="flex items-center gap-3 rounded-ir-sm border border-ir-warning/30 bg-ir-warning/10 px-3 py-2">
              <p className="min-w-0 flex-1 break-words text-xs text-ir-warning">
                Did you mean <strong>{emailSuggestion}</strong>?
              </p>
              <div className="flex shrink-0 gap-3">
                <button
                  className="rounded-ir-xs text-xs font-semibold text-ir-warning underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                  onClick={acceptEmailSuggestion}
                  type="button"
                >
                  Use this
                </button>
                <button
                  className="rounded-ir-xs text-xs text-ir-muted underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
                  onClick={dismissEmailSuggestion}
                  type="button"
                >
                  Keep as typed
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {canInviteAdmin && (
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
          <Button
            className="sm:ml-auto"
            disabled={submitting || !email.trim() || !smtpConfigured}
            type="submit"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <SpinnerIcon className="size-4 animate-spin" />
                Sending…
              </span>
            ) : (
              "Send invite"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
