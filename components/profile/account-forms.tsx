"use client";

import { SpinnerIcon, UserIcon, WarningIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  type ActionState,
  type AvatarActionState,
  changeEmailAction,
  deleteAccountAction,
  type NameActionState,
  removeAvatarAction,
  updateAvatarAction,
  updateNameAction,
} from "@/app/actions/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDirtyState } from "@/hooks/use-dirty-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { suggestEmailDomainFix } from "@/lib/email-typo";

const initialState: ActionState = {};
const initialAvatarState: AvatarActionState = {};
const initialNameState: NameActionState = {};
const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function ActionMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p className="rounded-ir-sm bg-ir-danger/10 p-3 text-sm text-ir-danger">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="rounded-ir-sm bg-ir-success/10 p-3 text-sm text-ir-success">
        {state.success}
      </p>
    );
  }
  return null;
}

function AvatarUploadRow({
  image,
  name,
}: {
  image: string | null;
  name: string;
}) {
  const [avatarState, avatarAction, avatarPending] = useActionState(
    updateAvatarAction,
    initialAvatarState
  );
  const [isRemoving, startRemoveTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState(image);
  const previousPreviewRef = useRef(image);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (avatarState.error) {
      toast.error(avatarState.error);
      setPreviewUrl(previousPreviewRef.current);
    } else if (avatarState.success && avatarState.imageUrl !== undefined) {
      setPreviewUrl(avatarState.imageUrl);
      previousPreviewRef.current = avatarState.imageUrl;
      toast.success(avatarState.success);
    }
  }, [avatarState]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      toast.error("Use a PNG, JPEG, WEBP, or GIF image.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be 4MB or smaller.");
      e.target.value = "";
      return;
    }

    previousPreviewRef.current = previewUrl;
    setPreviewUrl(URL.createObjectURL(file));
    formRef.current?.requestSubmit();
  }

  function handleRemove() {
    startRemoveTransition(async () => {
      const result = await removeAvatarAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      previousPreviewRef.current = null;
      setPreviewUrl(null);
      toast.success(result.success ?? "Profile picture removed.");
    });
  }

  const pending = avatarPending || isRemoving;
  const initials = name.trim().charAt(0).toUpperCase();

  return (
    <div className="px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
        <div className="w-full pt-0.5 sm:w-40 sm:shrink-0">
          <p className="text-sm font-medium text-ir-heading">Profile picture</p>
          <p className="mt-0.5 text-xs text-ir-muted">
            PNG, JPEG, WEBP, or GIF. Max 4MB.
          </p>
        </div>
        <form action={avatarAction} className="min-w-0 flex-1" ref={formRef}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar size="lg">
                {previewUrl && <AvatarImage alt={name} src={previewUrl} />}
                <AvatarFallback>
                  {initials || <UserIcon className="size-4" />}
                </AvatarFallback>
              </Avatar>
              {pending && (
                <div className="absolute inset-0 flex items-center justify-center rounded-ir-full bg-ir-surface/70">
                  <SpinnerIcon className="size-4 animate-spin text-ir-heading" />
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={pending}
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                type="button"
                variant="secondary"
              >
                {previewUrl ? "Change photo" : "Upload photo"}
              </Button>
              {previewUrl && (
                <Button
                  disabled={pending}
                  onClick={handleRemove}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Remove
                </Button>
              )}
            </div>
            <input
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              name="avatar"
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
          </div>
        </form>
      </div>
    </div>
  );
}

export function AccountIdentityForms({
  email,
  image,
  name,
}: {
  email: string;
  image: string | null;
  name: string;
}) {
  const router = useRouter();
  const [nameState, nameAction, namePending] = useActionState(
    updateNameAction,
    initialNameState
  );
  const [nameValue, setNameValue] = useState(name);
  const avatarName = nameValue.trim() || email;
  const { isDirty: nameDirty, markClean: markNameClean } = useDirtyState({
    name: nameValue,
  });
  const [emailState, emailAction, emailPending] = useActionState(
    changeEmailAction,
    initialState
  );
  const [emailValue, setEmailValue] = useState(email);
  const { isDirty: emailDirty, markClean: markEmailClean } = useDirtyState({
    email: emailValue,
  });
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [emailSuggestionDismissed, setEmailSuggestionDismissed] =
    useState(false);
  useUnsavedChangesGuard(nameDirty || emailDirty);

  useEffect(() => {
    if (nameState.success && nameState.name !== undefined) {
      setNameValue(nameState.name);
      markNameClean({ name: nameState.name });
      router.refresh();
    }
  }, [nameState.success, nameState.name, router, markNameClean]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberately excludes emailValue — this should only re-run when the action result changes, not on every keystroke
  useEffect(() => {
    if (emailState.success) {
      // The address doesn't take effect until the confirmation link is
      // clicked — nothing to revert to except "no more changes since the
      // link was sent," so the button goes back to disabled on the value
      // that was just submitted.
      markEmailClean({ email: emailValue });
    }
  }, [emailState.success, markEmailClean]);

  function acceptEmailSuggestion() {
    if (!emailSuggestion) {
      return;
    }
    setEmailValue(emailSuggestion);
    setEmailSuggestion(null);
  }

  function dismissEmailSuggestion() {
    setEmailSuggestionDismissed(true);
    setEmailSuggestion(null);
  }

  // An unacknowledged typo suggestion blocks the submit until the user
  // either accepts the fix or explicitly confirms the domain as typed —
  // otherwise a mistyped domain (e.g. "gailf.com") would silently send the
  // confirmation link to an address nobody can ever receive it at.
  function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    const domainFix = suggestEmailDomainFix(emailValue.trim());
    if (domainFix && !emailSuggestionDismissed) {
      e.preventDefault();
      setEmailSuggestion(domainFix);
    }
  }

  return (
    <div className="divide-y divide-ir-border overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
      {/* Profile picture */}
      <AvatarUploadRow image={image} name={avatarName} />

      {/* Display name */}
      <div className="px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
          <div className="w-full pt-0.5 sm:w-40 sm:shrink-0">
            <p className="text-sm font-medium text-ir-heading">Display name</p>
            <p className="mt-0.5 text-xs text-ir-muted">
              Shown in audit logs and admin views.
            </p>
          </div>
          <form action={nameAction} className="min-w-0 flex-1 space-y-3">
            <Input
              id="name"
              maxLength={100}
              name="name"
              onChange={(e) => setNameValue(e.target.value)}
              placeholder="Enter your profile name..."
              value={nameValue}
            />
            <ActionMessage state={nameState} />
            <Button
              disabled={namePending || !nameDirty}
              size="sm"
              type="submit"
            >
              {namePending ? "Saving…" : "Save name"}
            </Button>
          </form>
        </div>
      </div>

      {/* Email address */}
      <div className="px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
          <div className="w-full pt-0.5 sm:w-40 sm:shrink-0">
            <p className="text-sm font-medium text-ir-heading">Email address</p>
            <p className="mt-0.5 text-xs text-ir-muted">
              Used for magic-link sign-in. Changing it requires confirming a
              link sent to the new address.
            </p>
          </div>
          <form
            action={emailAction}
            className="min-w-0 flex-1 space-y-3"
            onSubmit={handleEmailSubmit}
          >
            <Input
              id="email"
              name="email"
              onChange={(e) => {
                setEmailValue(e.target.value);
                setEmailSuggestion(null);
                setEmailSuggestionDismissed(false);
              }}
              placeholder="Enter your email address..."
              required
              type="email"
              value={emailValue}
            />
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
            <ActionMessage state={emailState} />
            <Button
              disabled={emailPending || !emailDirty}
              size="sm"
              type="submit"
            >
              {emailPending ? "Sending…" : "Send confirmation link"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function DeleteAccountForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(
    deleteAccountAction,
    initialState
  );

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-ir-heading">Danger zone</h2>
        <p className="mt-0.5 text-xs text-ir-muted">
          Irreversible and destructive actions.
        </p>
      </div>

      <div className="rounded-ir-card border border-ir-danger/30 bg-ir-danger/5 p-5">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-ir-sm bg-ir-danger/10">
            <WarningIcon className="size-4 text-ir-danger" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ir-heading">
              Delete your account
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ir-muted">
              This permanently deletes your profile, all active sessions, and
              linked authentication accounts. Audit records are kept for
              operator history. This action cannot be undone.
            </p>
          </div>
        </div>

        <form action={action} className="space-y-3">
          <div>
            <label
              className="mb-1.5 block text-xs font-medium text-ir-heading"
              htmlFor="confirmEmail"
            >
              Type <span className="font-mono text-ir-heading/70">{email}</span>{" "}
              to confirm
            </label>
            <Input
              autoComplete="off"
              id="confirmEmail"
              name="confirmEmail"
              placeholder={email}
            />
          </div>
          <ActionMessage state={state} />
          <Button
            disabled={pending}
            size="sm"
            type="submit"
            variant="destructive"
          >
            {pending ? "Deleting…" : "Delete my account"}
          </Button>
        </form>
      </div>
    </section>
  );
}
