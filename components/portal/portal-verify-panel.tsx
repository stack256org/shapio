"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GUEST_NAME_MAX, GUEST_OTP_LENGTH } from "@/config/platform";

interface PortalVerifyPanelProps {
  onVerified: (identity: { email: string; name: string | null }) => void;
}

type Step = "email" | "code";

// In-place email verification for the Public Portal. Structurally the same
// two-step shape as the embed widget's EmbedAuthPanel, but this one creates NO
// account and NO session — it exchanges a one-time code for a signed
// identity cookie carrying the verified address (lib/portal/guest-identity.ts).
// Email only by design: there is no password, no Google, and nothing to
// remember, so a customer can leave feedback in seconds.
export function PortalVerifyPanel({ onVerified }: PortalVerifyPanelProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Counts down the resend cooldown the server enforces, so the button
  // communicates the wait instead of failing on click.
  const [cooldown, setCooldown] = useState(0);
  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function requestCode(): Promise<boolean> {
    setFormError(null);
    try {
      const res = await fetch("/api/portal/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFormError(data?.error ?? "Something went wrong. Please try again.");
        if (typeof data?.retryAfterSeconds === "number") {
          setCooldown(data.retryAfterSeconds);
        }
        return false;
      }

      setCooldown(0);
      return true;
    } catch {
      setFormError("Network error. Please try again.");
      return false;
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    const ok = await requestCode();
    setSending(false);
    if (ok) {
      setStep("code");
    }
  }

  async function handleResend() {
    setResending(true);
    await requestCode();
    setResending(false);
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setVerifying(true);

    try {
      const res = await fetch("/api/portal/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          email: email.trim(),
          name: name.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFormError(data?.error ?? "That code is not correct.");
        setVerifying(false);
        return;
      }

      onVerifiedRef.current({
        email: data.email,
        name: data.name ?? null,
      });
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  if (step === "code") {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm font-medium text-ir-heading">Enter your code</p>
          <p className="mt-1 text-sm text-ir-muted">
            We sent a {GUEST_OTP_LENGTH}-digit code to{" "}
            <strong className="text-ir-heading">{email}</strong>.
          </p>
        </div>

        <form className="space-y-3" onSubmit={handleCodeSubmit}>
          <label className="block" htmlFor="portal-verify-code">
            <span className="mb-1.5 block text-sm font-medium text-ir-heading">
              Code
            </span>
            <Input
              autoComplete="one-time-code"
              autoFocus
              className="text-center font-mono text-lg tracking-[0.3em]"
              disabled={verifying}
              id="portal-verify-code"
              inputMode="numeric"
              maxLength={GUEST_OTP_LENGTH}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
              placeholder={"0".repeat(GUEST_OTP_LENGTH)}
              required
              value={code}
            />
          </label>

          <label className="block" htmlFor="portal-verify-name">
            <span className="mb-1.5 block text-sm font-medium text-ir-heading">
              Your name{" "}
              <span className="font-normal text-ir-muted">(optional)</span>
            </span>
            <Input
              autoComplete="name"
              disabled={verifying}
              id="portal-verify-name"
              maxLength={GUEST_NAME_MAX}
              onChange={(event) => setName(event.target.value)}
              placeholder="Jane Doe"
              value={name}
            />
            <span className="mt-1 block text-xs text-ir-muted">
              Shown next to your feedback. Leave blank to stay anonymous.
            </span>
          </label>

          {formError && <p className="text-sm text-ir-danger">{formError}</p>}

          <Button
            className="w-full"
            disabled={verifying || code.length < GUEST_OTP_LENGTH}
            type="submit"
          >
            {verifying ? "Verifying…" : "Verify email"}
          </Button>
        </form>

        <div className="flex items-center justify-between text-xs">
          <button
            className="cursor-pointer rounded-ir-xs font-medium text-ir-muted transition-colors duration-150 ease-ir-standard hover:text-ir-heading hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
            onClick={() => {
              setStep("email");
              setCode("");
              setFormError(null);
            }}
            type="button"
          >
            Use a different email
          </button>
          <button
            className="cursor-pointer rounded-ir-xs font-medium text-ir-primary transition-opacity duration-150 ease-ir-standard hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={resending || cooldown > 0}
            onClick={handleResend}
            type="button"
          >
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : resending
                ? "Sending…"
                : "Resend code"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={handleEmailSubmit}>
      <label className="block" htmlFor="portal-verify-email">
        <span className="mb-1.5 block text-sm font-medium text-ir-heading">
          Email
        </span>
        <Input
          autoComplete="email"
          autoFocus
          disabled={sending}
          id="portal-verify-email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
      </label>

      {formError && <p className="text-sm text-ir-danger">{formError}</p>}

      <Button
        className="w-full"
        disabled={sending || !email.trim() || cooldown > 0}
        type="submit"
      >
        {cooldown > 0
          ? `Try again in ${cooldown}s`
          : sending
            ? "Sending code…"
            : "Send verification code"}
      </Button>

      <p className="text-center text-xs text-ir-muted">
        No account or password needed — we only confirm your email.
      </p>
    </form>
  );
}
