"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GUEST_NAME_MAX, GUEST_OTP_LENGTH } from "@/config/platform";
import { setGuestToken } from "@/lib/embed/guest-token";

interface EmbedAuthPanelProps {
  onAuthenticated: () => void;
}

type Step = "email" | "otp";

// In-place email verification for the embed widget.
//
// The widget is a PUBLIC feedback surface: anyone may leave feedback, and the
// one-time code exists only to prove the address is real and reachable — it is
// not a login. No account is created, which is why this posts to the portal's
// accountless endpoints (/api/portal/otp/*) rather than Better Auth's sign-in
// routes, and why there is no Google button or password anywhere here.
//
// Same two-step shape as the Public Portal's PortalVerifyPanel; the difference
// is transport. The verified identity comes back as a signed token which is
// stored and replayed on X-Portal-Guest, because the widget's iframe is
// cross-site and browsers refuse to send the portal's SameSite=Lax cookie
// there. See lib/embed/guest-token.ts.
export function EmbedAuthPanel({ onAuthenticated }: EmbedAuthPanelProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Counts down the resend cooldown the server enforces, so the button
  // explains the wait instead of failing on click.
  const [cooldown, setCooldown] = useState(0);
  const onAuthenticatedRef = useRef(onAuthenticated);
  onAuthenticatedRef.current = onAuthenticated;

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(): Promise<boolean> {
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
    setSendingCode(true);
    const ok = await sendCode();
    setSendingCode(false);
    if (ok) {
      setStep("otp");
    }
  }

  async function handleResend() {
    setResending(true);
    await sendCode();
    setResending(false);
  }

  async function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setVerifying(true);

    try {
      const res = await fetch("/api/portal/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: otp,
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

      // The cookie that response sets never comes back from inside this
      // cross-site iframe — this token is what actually carries the identity
      // on every subsequent embed request.
      if (typeof data?.token === "string") {
        setGuestToken(data.token);
      }
      onAuthenticatedRef.current();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  if (step === "otp") {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm font-medium text-ir-heading">Enter your code</p>
          <p className="mt-1 text-sm text-ir-muted">
            We sent a {GUEST_OTP_LENGTH}-digit code to{" "}
            <strong className="text-ir-heading">{email}</strong>.
          </p>
        </div>

        <form className="space-y-3" onSubmit={handleOtpSubmit}>
          <label className="block" htmlFor="embed-auth-otp">
            <span className="mb-1.5 block text-sm font-medium text-ir-heading">
              Code
            </span>
            <Input
              autoComplete="one-time-code"
              autoFocus
              className="text-center font-mono text-lg tracking-[0.3em]"
              disabled={verifying}
              id="embed-auth-otp"
              inputMode="numeric"
              maxLength={GUEST_OTP_LENGTH}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, ""))
              }
              placeholder={"0".repeat(GUEST_OTP_LENGTH)}
              required
              value={otp}
            />
          </label>

          <label className="block" htmlFor="embed-auth-name">
            <span className="mb-1.5 block text-sm font-medium text-ir-heading">
              Your name{" "}
              <span className="font-normal text-ir-muted">(optional)</span>
            </span>
            <Input
              autoComplete="name"
              disabled={verifying}
              id="embed-auth-name"
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
            disabled={verifying || otp.length < GUEST_OTP_LENGTH}
            type="submit"
          >
            {verifying ? "Verifying…" : "Verify email"}
          </Button>
        </form>

        <div className="flex items-center justify-between text-xs">
          <button
            className="cursor-pointer rounded-ir-xs font-medium text-ir-muted hover:text-ir-heading hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40"
            onClick={() => {
              setStep("email");
              setOtp("");
              setFormError(null);
            }}
            type="button"
          >
            Use a different email
          </button>
          <button
            className="cursor-pointer rounded-ir-xs font-medium text-ir-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ir-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
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
      <label className="block" htmlFor="embed-auth-email">
        <span className="mb-1.5 block text-sm font-medium text-ir-heading">
          Email
        </span>
        <Input
          autoComplete="email"
          autoFocus
          disabled={sendingCode}
          id="embed-auth-email"
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
        disabled={sendingCode || !email.trim() || cooldown > 0}
        type="submit"
      >
        {cooldown > 0
          ? `Try again in ${cooldown}s`
          : sendingCode
            ? "Sending code…"
            : "Send verification code"}
      </Button>

      <p className="text-center text-xs text-ir-muted">
        No account or password needed — we only confirm your email.
      </p>
    </form>
  );
}
