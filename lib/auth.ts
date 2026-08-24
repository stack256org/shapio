import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { emailOTP } from "better-auth/plugins/email-otp";
import { magicLink } from "better-auth/plugins/magic-link";
import { headers } from "next/headers";
import { PRODUCT_NAME } from "@/config/platform";
import * as schema from "@/db/schema";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { enqueueEmail } from "@/lib/email";
import { magicLinkTemplate } from "@/lib/email/templates/magic-link";
import { otpTemplate } from "@/lib/email/templates/otp";
import { passwordResetTemplate } from "@/lib/email/templates/password-reset";
import { env } from "@/lib/env";
import { getGoogleOAuthSettings } from "@/lib/integration-settings";
import { isSmtpConfigured } from "@/lib/smtp/client";
import { adminBaseUrl, adminHost, portalBaseUrl, portalHost } from "@/lib/urls";
import {
  mayAuthenticate,
  mayCreateAccount,
  NO_SELF_SIGNUP_MESSAGE,
} from "@/lib/users/registration";

// Both application hosts are trusted request origins (CSRF/origin check). Under
// the two-host split each host sets its OWN host-only session cookie, so signing
// in on one never authenticates the other. Deduped in case they're equal.
const TRUSTED_ORIGINS = Array.from(
  new Set([env.NEXT_PUBLIC_APP_URL, adminBaseUrl(), portalBaseUrl()])
);

/**
 * A magic-link verification URL must land on the SAME host the person signed in
 * from, so the session cookie is set on that host (Workspace vs Portal). Better
 * Auth builds the URL from the configured baseURL (the admin host); rewrite its
 * origin to the host of the incoming sign-in request.
 */
async function rewriteToRequestHost(url: string): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) {
      return url;
    }
    const proto =
      h.get("x-forwarded-proto") ??
      (host.includes("localhost") ? "http" : "https");
    const original = new URL(url);
    return new URL(
      original.pathname + original.search,
      `${proto}://${host}`
    ).toString();
  } catch {
    return url;
  }
}

/**
 * better-auth builds its client once, here, at module-evaluation time — not
 * per-request. Two of its settings are sourced from lib/integration-settings.ts
 * (DB row with .env fallback): Google OAuth credentials and whether SMTP is
 * configured (which gates email verification). Changing either through
 * Admin → Integrations / the setup wizard does NOT take effect until the app
 * process restarts (a redeploy, or a dev-server reload) — this is the one
 * documented restart-required exception, called out in full in
 * docs/implementation/INTEGRATIONS.md. Everywhere else that reads these settings (actually
 * sending an email via lib/smtp/client.ts, building an S3 client, checking
 * the webhook secret) does a fresh per-call DB read and applies live.
 */
async function createAuth() {
  const [smtpConfigured, google] = await Promise.all([
    isSmtpConfigured(),
    getGoogleOAuthSettings(),
  ]);

  // Exposed alongside `auth` so callers deciding whether to SHOW the Google
  // button (e.g. the sign-in page) stay consistent with what's actually wired
  // into socialProviders below — both are frozen at this same boot-time read.
  const googleOAuthEnabled = !!google;

  const auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    secret: env.APP_SECRET,
    // Resolve the auth origin (OAuth redirect_uri, callbacks, etc.) PER-REQUEST
    // from the incoming host, constrained to our two known hosts. This makes
    // Google sign-in return to the host it started from — so it works on the
    // Portal host as well as the Workspace host — with no global mutable state
    // and no host-specific branches. Better Auth validates the resolved host
    // against `allowedHosts` (rejecting host-header injection) and clones the
    // request context internally. Requests without a host header (e.g. background
    // jobs) use `fallback` — the admin host — preserving prior behavior.
    baseURL: {
      allowedHosts: Array.from(
        new Set([adminHost(), portalHost()].filter((h): h is string => !!h))
      ),
      protocol: "auto",
      fallback: adminBaseUrl(),
    },
    trustedOrigins: TRUSTED_ORIGINS,
    // The embed widget renders Portal pages inside an iframe on a customer's own
    // (third-party) site. Browsers treat ANY request made from within that iframe
    // as cross-site for cookie purposes — relative to the customer's top-level
    // page, not this app's own origin — regardless of same-origin navigation
    // happening inside the iframe itself. Better Auth's session cookie defaults
    // to SameSite=Lax, which browsers refuse to store for such cross-site
    // requests: confirmed live via Chrome's own network stack, which reports
    // `blockedReasons: ["SameSiteLax"]` on the Set-Cookie response when signing
    // in from inside a cross-site embed. That's why in-widget auth silently
    // never persists a session — every subsequent authenticated action gets
    // "signed out" again and reopens the sign-in dialog.
    // SameSite=None (paired with Secure, which the spec requires and which
    // Better Auth already sets whenever the resolved protocol is https) is the
    // standard fix for auth that must work inside a third-party iframe — the
    // same approach embeddable widgets like Intercom/Crisp use. Restricted to
    // production only: `Secure` cookies are refused outright by browsers over
    // plain http://, so applying this in local dev would break sign-in
    // entirely there instead of fixing anything.
    advanced:
      env.NODE_ENV === "production"
        ? { defaultCookieAttributes: { sameSite: "none", secure: true } }
        : undefined,
    socialProviders: {
      ...(google
        ? {
            google: {
              clientId: google.clientId,
              clientSecret: google.clientSecret,
            },
          }
        : {}),
    },
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "magic-link", "email-otp"],
    },
    emailAndPassword: {
      // Sign-IN with an existing password always works — the account created by
      // the /setup first-run wizard, and invited members who chose a password
      // during setup. Self-serve REGISTRATION does not exist: /sign-up/email is
      // refused in the `before` hook below, so this stays enabled purely to keep
      // the sign-in half of the endpoint pair alive. The `password_auth` feature
      // flag now only controls whether the UI offers the password field.
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // Only enforce verification when we can actually deliver the email —
      // otherwise an SMTP-less self-host could never sign in.
      requireEmailVerification: smtpConfigured,
      // A reset means the old password may be compromised — kill every existing
      // session for that user.
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        // Dev convenience, mirroring sendMagicLink: never log in production.
        if (env.NODE_ENV !== "production") {
          console.log(`[password-reset] recipient=${user.email} url=${url}`);
        }

        const { html, text } = await passwordResetTemplate({
          email: user.email,
          resetUrl: url,
        });

        await enqueueEmail({
          to: user.email,
          subject: `Reset your ${PRODUCT_NAME} password`,
          html,
          text,
        });

        await audit({
          action: "auth.password_reset_requested",
          actorEmail: user.email,
          actorId: user.id,
          description: `Password reset requested for ${user.email}`,
          entityId: user.id,
          entityType: "user",
        });
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        // This instance has NO self-serve registration — accounts come from the
        // /setup wizard or an invitation (see lib/users/registration.ts). The
        // endpoint is refused outright rather than merely hidden in the UI.
        if (ctx.path === "/sign-up/email") {
          throw new APIError("FORBIDDEN", {
            message: NO_SELF_SIGNUP_MESSAGE,
          });
        }

        // Refuse an unknown address BEFORE anything is emailed, so nobody
        // receives a magic link or a code that could only fail at the end.
        // An existing account passes (it's an ordinary sign-in); so does an
        // address with a live invitation waiting, which is exactly how an
        // invited member gets their account created on first sign-in.
        const emailPaths = [
          "/sign-in/magic-link",
          "/sign-in/email-otp",
          "/email-otp/send-verification-otp",
        ];
        if (emailPaths.includes(ctx.path)) {
          const body = ctx.body as
            | { callbackURL?: unknown; email?: unknown }
            | undefined;
          const email = body?.email;
          const callbackURL =
            typeof body?.callbackURL === "string" ? body.callbackURL : null;
          if (
            typeof email === "string" &&
            email.trim() &&
            !(await mayAuthenticate(email, callbackURL))
          ) {
            throw new APIError("FORBIDDEN", {
              message: NO_SELF_SIGNUP_MESSAGE,
            });
          }
        }
      }),
    },
    plugins: [
      // Bearer-token auth is additive: cookies keep working exactly as
      // before for the Admin Panel and Public Portal. This exists solely
      // for the embed widget, whose iframe is always cross-site relative
      // to whatever page embeds it — its session cookie gets
      // SameSite=Lax-blocked by the browser and never persists (confirmed
      // live via the Chrome DevTools Protocol; see the implementation
      // plan). A request with no Authorization header is completely
      // unaffected by this plugin — see node_modules/better-auth/dist/
      // plugins/bearer/index.mjs, whose `before` hook only activates when
      // one is present.
      bearer(),
      admin({
        impersonationSessionDuration: 3600,
        allowImpersonatingAdmins: false,
      }),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          // Point the verification link at the host the user signed in from, so
          // the resulting session cookie is scoped to that app (Workspace/Portal).
          const magicLinkUrl = await rewriteToRequestHost(url);

          // Never log recipient emails or sign-in URLs in production (PII + a live
          // credential). The dev log is a convenience for local sign-in without SMTP.
          if (env.NODE_ENV !== "production") {
            console.log(`[magic-link] recipient=${email} url=${magicLinkUrl}`);
          }

          const { html, text } = await magicLinkTemplate({
            email,
            magicLinkUrl,
          });

          await enqueueEmail({
            to: email,
            subject: `Sign in to ${PRODUCT_NAME}`,
            html,
            text,
          });

          await audit({
            action: "auth.magic_link_sent",
            actorEmail: email,
            description: `Magic link sent to ${email}`,
            entityType: "user",
            metadata: { email, url: magicLinkUrl },
          });
        },
      }),
      // One-time code sign-in — used by the embed widget so authentication
      // never needs a second tab (unlike the magic-link email, which has to be
      // opened somewhere): the visitor types the code back into the same
      // panel they requested it from. Better Auth's /sign-in/email-otp returns
      // a session directly (no redirect), so there's no host to get wrong.
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        sendVerificationOTP: async ({ email, otp }) => {
          // Never log recipient emails or OTP codes in production (PII + a live
          // credential). The dev log is a convenience for local sign-in without SMTP.
          if (env.NODE_ENV !== "production") {
            console.log(`[email-otp] recipient=${email} otp=${otp}`);
          }

          const { html, text } = await otpTemplate({ email, otp });

          await enqueueEmail({
            to: email,
            subject: `Your ${PRODUCT_NAME} sign-in code`,
            html,
            text,
          });

          await audit({
            action: "auth.otp_sent",
            actorEmail: email,
            description: `Sign-in code sent to ${email}`,
            entityType: "user",
            metadata: { email },
          });
        },
      }),
    ],
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60,
      },
    },
    databaseHooks: {
      user: {
        create: {
          // The single chokepoint every sign-in method funnels through, and the
          // only one that covers Google: with OAuth the email isn't known until
          // the provider calls back, long after the `before` hook above ran with
          // no email to check. Refusing here means no path — magic link, Google,
          // email OTP, or a future one — can quietly mint an account.
          //
          // The /setup first-run wizard is deliberately unaffected: it inserts
          // the first Orbit Admin with Drizzle directly (app/actions/setup.ts),
          // never through Better Auth, so this hook never sees it. That is what
          // keeps a brand-new instance bootstrappable.
          before: async (newUser, context) => {
            // The magic-link/email-OTP verify endpoints carry the invite-link
            // path forward as `callbackURL` — in the query string for the GET
            // verify link, in the body for endpoints that resolve in one
            // request. Either shape can appear here depending on which
            // provider is minting the account.
            const query = context?.query as
              | { callbackURL?: unknown }
              | undefined;
            const body = context?.body as { callbackURL?: unknown } | undefined;
            const callbackURL =
              typeof query?.callbackURL === "string"
                ? query.callbackURL
                : typeof body?.callbackURL === "string"
                  ? body.callbackURL
                  : null;
            if (!(await mayCreateAccount(newUser.email, callbackURL))) {
              throw new APIError("FORBIDDEN", {
                message: NO_SELF_SIGNUP_MESSAGE,
              });
            }
          },
          after: async (user) => {
            await audit({
              action: "user.created",
              actorEmail: user.email,
              actorId: user.id,
              description: `User created: ${user.email}`,
              entityId: user.id,
              entityType: "user",
            });
          },
        },
      },
    },
  });

  return { auth, googleOAuthEnabled };
}

export const { auth, googleOAuthEnabled } = await createAuth();
