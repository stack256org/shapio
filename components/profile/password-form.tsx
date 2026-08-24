"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { type ActionState, updatePasswordAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/config/platform";

const initialState: ActionState = {};

interface PasswordFormProps {
  // False for someone who has only ever signed in by magic link or Google.
  // They have no current password to challenge, so the form asks for one
  // fewer field and the copy explains what setting one gets them.
  hasPassword: boolean;
}

export function PasswordForm({ hasPassword }: PasswordFormProps) {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      // Never leave the entered password sitting in the DOM after a save.
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-ir-heading">Password</h2>
        <p className="mt-0.5 text-xs text-ir-muted">
          {hasPassword
            ? "Change the password you use to sign in with your email address."
            : "You don't have a password yet — you've been signing in with a magic link or Google. Set one to also sign in with your email address."}
        </p>
      </div>

      <div className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
        <div className="px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
            <div className="w-full pt-0.5 sm:w-40 sm:shrink-0">
              <p className="text-sm font-medium text-ir-heading">
                {hasPassword ? "Change password" : "Set a password"}
              </p>
              <p className="mt-0.5 text-xs text-ir-muted">
                At least {MIN_PASSWORD_LENGTH} characters.
              </p>
            </div>

            <form
              action={formAction}
              className="min-w-0 flex-1 space-y-3"
              ref={formRef}
            >
              {hasPassword && (
                <label className="block" htmlFor="current-password">
                  <span className="mb-1.5 block text-xs font-medium text-ir-muted">
                    Current password
                  </span>
                  <Input
                    autoComplete="current-password"
                    id="current-password"
                    name="currentPassword"
                    placeholder="Enter your current password"
                    required
                    type="password"
                  />
                </label>
              )}

              <label className="block" htmlFor="new-password">
                <span className="mb-1.5 block text-xs font-medium text-ir-muted">
                  {hasPassword ? "New password" : "Password"}
                </span>
                <Input
                  autoComplete="new-password"
                  id="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  name="password"
                  placeholder={
                    hasPassword ? "Enter a new password" : "Create a password"
                  }
                  required
                  type="password"
                />
              </label>

              <label className="block" htmlFor="confirm-password">
                <span className="mb-1.5 block text-xs font-medium text-ir-muted">
                  Confirm password
                </span>
                <Input
                  autoComplete="new-password"
                  id="confirm-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  name="confirmPassword"
                  placeholder="Re-enter the password"
                  required
                  type="password"
                />
              </label>

              {state.error && (
                <p className="text-xs text-ir-danger">{state.error}</p>
              )}

              <Button disabled={pending} size="sm" type="submit">
                {pending
                  ? "Saving…"
                  : hasPassword
                    ? "Update password"
                    : "Set password"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
