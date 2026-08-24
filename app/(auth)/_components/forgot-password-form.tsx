"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  type ForgotPasswordState,
  forgotPasswordAction,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialState
  );
  const [email, setEmail] = useState("");

  if (state.success) {
    return (
      <div className="space-y-3">
        <p className="rounded-ir-sm bg-ir-success/10 p-3 text-sm text-ir-success">
          {state.success}
        </p>
        <p className="text-center text-xs text-ir-muted">
          <Link className="underline hover:no-underline" href="/signin">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <label className="block" htmlFor="email">
        <span className="mb-1.5 block text-sm font-semibold text-ir-heading">
          Email
        </span>
        <Input
          autoComplete="email"
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
      </label>

      {state.error && (
        <p className="rounded-ir-sm bg-ir-danger/10 p-3 text-sm text-ir-danger">
          {state.error}
        </p>
      )}

      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-ir-muted">
        <Link
          className="font-semibold text-ir-heading underline hover:no-underline"
          href="/signin"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
