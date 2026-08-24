"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import {
  type CompleteSetupState,
  completeSetupAction,
} from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { PasswordInput } from "@/components/ui/password-input";
import { MIN_PASSWORD_LENGTH, PRODUCT_NAME } from "@/config/platform";

const initialState: CompleteSetupState = {};

interface CompleteProfileFormProps {
  email: string;
  needsPassword: boolean;
  needsProfile: boolean;
  next: string;
}

export function CompleteProfileForm({
  email,
  needsPassword,
  needsProfile,
  next,
}: CompleteProfileFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    completeSetupAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      router.push(next);
    }
  }, [state.success, next, router]);

  // Follows what is actually being asked for, so the screen never promises
  // more than it shows.
  const subheading =
    needsProfile && needsPassword
      ? "Choose how you'll appear, and how you'll sign in."
      : needsPassword
        ? "Set a password so you can sign in with your email."
        : "Before joining your workspace, let's complete your profile.";

  return (
    <main className="grid min-h-screen place-items-center bg-ir-primary-light/20 px-4 py-6 sm:py-8">
      <div className="w-full max-w-md rounded-ir-xl border border-ir-border bg-ir-surface px-6 py-8 shadow-ir-lg sm:px-10 sm:py-10">
        <div className="flex flex-col items-center text-center">
          <Logo className="h-9 w-auto" priority />
          <h1 className="mt-6 text-xl font-bold text-ir-heading sm:text-2xl">
            Welcome to {PRODUCT_NAME}
          </h1>
          <p className="mt-1.5 text-sm text-ir-muted">{subheading}</p>
        </div>

        <form action={formAction} className="mt-8 space-y-4 text-left">
          {needsProfile && (
            <label className="block" htmlFor="complete-profile-name">
              <span className="mb-1.5 block text-sm font-semibold text-ir-heading">
                Full Name
              </span>
              <Input
                autoComplete="name"
                autoFocus
                id="complete-profile-name"
                maxLength={100}
                name="name"
                placeholder="Your full name"
                required
              />
            </label>
          )}

          {needsPassword && (
            <>
              <label className="block" htmlFor="complete-profile-password">
                <span className="mb-1.5 block text-sm font-semibold text-ir-heading">
                  Password
                </span>
                <PasswordInput
                  autoComplete="new-password"
                  autoFocus={!needsProfile}
                  id="complete-profile-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  name="password"
                  placeholder="Create a password"
                  required
                />
                <span className="mt-1 block text-xs text-ir-muted">
                  At least {MIN_PASSWORD_LENGTH} characters.
                </span>
              </label>

              <label className="block" htmlFor="complete-profile-confirm">
                <span className="mb-1.5 block text-sm font-semibold text-ir-heading">
                  Confirm password
                </span>
                <PasswordInput
                  autoComplete="new-password"
                  id="complete-profile-confirm"
                  minLength={MIN_PASSWORD_LENGTH}
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  required
                />
              </label>
            </>
          )}

          {state.error && (
            <p className="rounded-ir-sm bg-ir-danger/10 p-3 text-sm text-ir-danger">
              {state.error}
            </p>
          )}

          <Button className="w-full" disabled={pending} size="lg" type="submit">
            {pending ? "Saving…" : "Continue"}
          </Button>

          {needsPassword && (
            <p className="text-center text-xs text-ir-muted">
              You'll use this with{" "}
              <span className="font-medium text-ir-heading">{email}</span> to
              sign in.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
