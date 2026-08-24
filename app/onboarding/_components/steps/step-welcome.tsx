"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { PRODUCT_NAME } from "@/config/platform";

interface StepWelcomeProps {
  error?: string | null;
  name: string;
  onContinue: () => void;
  onNameChange: (value: string) => void;
  onWorkspaceNameChange: (value: string) => void;
  workspaceName: string;
}

export function StepWelcome({
  name,
  onNameChange,
  workspaceName,
  onWorkspaceNameChange,
  onContinue,
  error,
}: StepWelcomeProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onContinue();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
      <Logo className="h-9 w-auto" priority />

      <h1 className="mt-6 text-2xl font-bold text-ir-heading">
        Welcome to {PRODUCT_NAME}!
      </h1>
      <p className="mt-1.5 text-sm text-ir-muted">
        Let's set up your workspace in less than a minute.
      </p>

      <form className="mt-8 w-full space-y-4 text-left" onSubmit={handleSubmit}>
        <label className="block" htmlFor="onboarding-name">
          <span className="mb-1.5 block text-sm font-semibold text-ir-heading">
            Your name
          </span>
          <Input
            autoComplete="name"
            autoFocus
            id="onboarding-name"
            maxLength={100}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="What do we call you?"
            value={name}
          />
        </label>

        <label className="block" htmlFor="onboarding-workspace-name">
          <span className="mb-1.5 block text-sm font-semibold text-ir-heading">
            Your workspace
          </span>
          <Input
            autoComplete="organization"
            id="onboarding-workspace-name"
            maxLength={64}
            onChange={(e) => onWorkspaceNameChange(e.target.value)}
            placeholder="What's the name of your company or project?"
            value={workspaceName}
          />
        </label>

        {error && (
          <p className="rounded-ir-sm bg-ir-danger/10 p-3 text-sm text-ir-danger">
            {error}
          </p>
        )}

        <Button className="w-full" size="lg" type="submit">
          Continue
        </Button>
      </form>
    </div>
  );
}
