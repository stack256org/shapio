# Feature 01 — Authentication (Implementation Reference)

> Implementation reference for Feature 01 — Authentication. Product behaviour: [../../features/01-authentication.md](../../features/01-authentication.md)

This file captures the technical detail removed from the product spec: API endpoints, service layer, rate limiting, session handling, and engineering notes. For the auth library and environment configuration see [../TECH-STACK.md](../TECH-STACK.md). For the full database schema see [../DATABASE.md](../DATABASE.md).

> **Implemented (Phase 6 — URL alignment).** The sign-in route is now `/signin` (`app/(auth)/login` → `app/(auth)/signin`), matching the documented URL. `/signup` exists as a route that `redirect()`s to `/signin` (sign-up and sign-in are the same passwordless flow). All redirects/links — `requireSession`, `middleware.ts`, marketing CTAs, invite pages, the portal sign-in prompts — now point at `/signin`.

---

## Dependencies

| Library | Purpose |
|---|---|
| `better-auth` | Core auth library (server + client) |
| `nodemailer` | SMTP email sending for magic links |
| `@types/nodemailer` | TypeScript types |

Auth is powered entirely by Better Auth (Magic Link + Google OAuth). See [../TECH-STACK.md](../TECH-STACK.md) for the full stack and the rationale for no email/password auth.

---

## Environment Variables

Authentication uses the following variables (see [../TECH-STACK.md](../TECH-STACK.md) for the complete list):

```env
# Better Auth
BETTER_AUTH_SECRET="generate: openssl rand -base64 32"
BETTER_AUTH_URL="http://localhost:3000"

# Google OAuth (leave blank to disable Google login)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# SMTP — used to send magic link emails
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="IdeaRoads <noreply@yourdomain.com>"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="IdeaRoads"
```

---

## Database Schema

Better Auth manages its own tables (`user`, `session`, `account`, `verification`). These are created via `auth.api` or Drizzle push and must **not** be manually edited. See [../DATABASE.md](../DATABASE.md) for the canonical schema and role mapping — do not duplicate column definitions here.

- `user` — identity record (id, name, email, emailVerified, image, timestamps).
- `session` — active sessions, cascade-deleted with the user.
- `account` — linked providers (e.g. `google`, `magic-link`); `password` column is unused.
- `verification` — magic link one-time tokens; expiry and cleanup handled by Better Auth.

The `superadmins` table (see [../DATABASE.md](../DATABASE.md)) backs the Platform Admin product role and is checked during post-sign-in routing.

---

## File Structure

```
lib/
├── auth.ts               Better Auth server instance
├── auth-client.ts        Better Auth browser client
├── email.ts              Nodemailer transporter
├── rate-limit.ts         PostgreSQL sliding-window rate limiter
└── api/auth-helpers.ts   Reusable session/role guards for API routes

db/schema/
└── auth.ts               Drizzle schema for Better Auth tables

app/
├── (auth)/
│   ├── signin/page.tsx   Sign in page (Magic Link + Google)
│   └── signup/page.tsx   Redirects to /signin (no separate signup)
├── post-auth/page.tsx    Post-login redirect logic
└── api/
    ├── auth/[...all]/route.ts   Better Auth API handler (all /api/auth/*)
    └── account/route.ts         Profile update + account deletion

components/
└── auth/
    ├── magic-link-form.tsx
    └── google-signin-button.tsx

middleware.ts              Route protection
```

---

## Service Layer

### `lib/auth.ts` — Server Config

```ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { magicLink } from "better-auth/plugins"
import { db } from "@/db"
import * as schema from "@/db/schema"
import { sendMagicLinkEmail } from "@/lib/email"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ to: email, url })
      },
    }),
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,       // 30 days
    updateAge: 60 * 60 * 24,             // refresh if older than 1 day
  },
  user: {
    additionalFields: {},
  },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
```

### `lib/auth-client.ts` — Browser Client

```ts
import { createAuthClient } from "better-auth/react"
import { magicLinkClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [magicLinkClient()],
})

export const { signIn, signOut, useSession } = authClient
```

### `lib/email.ts` — Nodemailer SMTP

```ts
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendMagicLinkEmail({ to, url }: { to: string; url: string }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Your sign-in link for ${process.env.NEXT_PUBLIC_APP_NAME}`,
    html: `
      <p>Click the link below to sign in. This link expires in 10 minutes.</p>
      <a href="${url}" style="...">Sign in to ${process.env.NEXT_PUBLIC_APP_NAME}</a>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
    text: `Sign in to ${process.env.NEXT_PUBLIC_APP_NAME}: ${url}`,
  })
}
```

### Auth helpers — `lib/api/auth-helpers.ts`

Reusable helpers used across all API routes.

```ts
requireSession(request)
  → Returns session or throws 401 Response

requireWorkspaceMember(request, workspaceSlug)
  → Returns { session, member, workspace } or throws 401 / 403 / 404

requireRole(member, roles: Role[])
  → Throws 403 if member role not in allowed roles
```

---

## API Endpoints

### `app/api/auth/[...all]/route.ts`

```ts
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)
```

All Better Auth endpoints (magic link request, OAuth callback, sign out, get-session) are served through this catch-all handler. Raw tokens are never exposed to the client.

### Sign-in page — `app/(auth)/signin/page.tsx`

- Single page for both sign in and sign up (Better Auth auto-creates accounts).
- Renders `MagicLinkForm` (email input + "Send Magic Link") and `GoogleSignInButton` (only when Google is configured), with a divider between methods.
- On magic link submit: show "Check your email" success state.
- Redirect after success goes to `/post-auth`.

### Signup page — `app/(auth)/signup/page.tsx`

- Redirects to `/signin`. Better Auth auto-creates a new account on first sign-in, so there is no separate registration form.

### Post-auth routing — `app/post-auth/page.tsx`

Server component, runs after successful sign-in.

```
1. Get session (auth.api.getSession)
2. If no session → redirect /signin
3. If user is a Platform Admin (in superadmins table) → redirect /orbit
4. If user has any workspace_members record
   → Yes: redirect to their first workspace /{ws-slug}
   → No:  redirect to /onboarding (create first workspace)
```

### `components/auth/magic-link-form.tsx`

- Client component. State: `email`, `loading`, `sent`.
- On submit: `authClient.signIn.magicLink({ email, callbackURL: "/post-auth" })`.
- On success: "Check your inbox" with the email shown. On error: toast. Validates email format before submit.

### `components/auth/google-signin-button.tsx`

- Client component. Calls `authClient.signIn.social({ provider: "google", callbackURL: "/post-auth" })`.
- Only rendered when `NEXT_PUBLIC_GOOGLE_ENABLED=true` (derived from env). Shows Google logo + "Continue with Google".

### `PATCH /api/account` — Profile update

```
Auth: Requires valid session
Body: { name?: string, image?: string }

Validates:
  - name: optional, 1–100 chars, trimmed
  - image: optional, valid URL, max 500 chars

Logic:
  → UPDATE user SET name = ?, image = ?, updatedAt = now() WHERE id = session.user.id

Returns:
  200 { user }   — updated user record
```

### `DELETE /api/account` — Account deletion (GDPR right to erasure)

```
Auth: Requires valid session
Body: { confirmation: "DELETE" }  — explicit user intent required

Logic:
  1. Verify session
  2. Require body.confirmation === "DELETE" — prevents accidental calls
  3. In a single transaction:
     a. Anonymize posts: SET author_name = "Deleted User", author_email = null, author_id = null
     b. Soft-delete comments: already handled (is_deleted = true + body cleared)
     c. SET NULL on votes.user_id for this user's votes (vote count preserved)
     d. Delete all sessions for this user
     e. Delete the user row → CASCADE removes: workspace_members, notifications,
        invites, superadmins (if any), better_auth account/session rows

Returns:
  204     — account deleted, all sessions invalidated
  400     — confirmation string missing or wrong
  401     — not signed in
```

Profile and account settings live at `/{ws-slug}/settings/account`, accessible to any signed-in user (reached from the user avatar dropdown). Sections: Profile (display name, avatar URL → `PATCH /api/account`) and Danger Zone ("Delete Account" → confirmation dialog → `DELETE /api/account`).

---

## Middleware — Route Protection

**File:** `middleware.ts`

```
Protected route groups (require valid session):
  /(workspace)/*  → must be signed in (Brand Admin or Team Member)
  /onboarding     → must be signed in (new user creating workspace)
  /post-auth      → must be signed in (post-login redirect)
  /orbit/*        → must be signed in + must be Platform Admin (checked in orbit layout)

Public routes (no auth required):
  /signin         → sign in / register
  /(public)/*     → public boards, roadmap, changelog
  /api/auth/*     → Better Auth endpoints
  /invite/*       → invite accept pages (handle auth internally)
```

Implementation uses `betterFetch` to call `/api/auth/get-session` from middleware, checking the cookie header.

**Note:** The `/orbit` prefix requires Platform Admin status, enforced in `app/(orbit)/layout.tsx` by checking the `superadmins` table. Non-platform-admins get 404 (not 403).

---

## Session Handling

### In Server Components / Route Handlers

```ts
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

const session = await auth.api.getSession({ headers: await headers() })
if (!session) redirect("/signin")
```

### In API Routes

```ts
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
}
```

### In Client Components

```ts
import { useSession } from "@/lib/auth-client"

const { data: session, isPending } = useSession()
```

Sessions expire in 30 days and are refreshed every 24 hours. On expiry, middleware redirects to `/signin`.

---

## Rate Limiting

The magic link endpoint is an email-flooding vector: unconstrained, an attacker can trigger thousands of emails to a target address within seconds.

**Limits applied in `middleware.ts` before Better Auth handles the request:**

| Signal | Limit | Window |
|--------|-------|--------|
| Per email address | 5 requests | 1 hour |
| Per IP address | 10 requests | 1 hour |

**Implementation:** Sliding-window counters stored in PostgreSQL — no Redis required. On limit hit: return `429 Too Many Requests` without forwarding to Better Auth (no email sent, no token generated).

```ts
// lib/rate-limit.ts — PostgreSQL sliding window
async function checkRateLimit(key: string, limit: number, windowSecs: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowSecs * 1000)
  const count = await db
    .select({ count: sql<number>`count(*)` })
    .from(rateLimitEvents)
    .where(and(eq(rateLimitEvents.key, key), gte(rateLimitEvents.createdAt, windowStart)))
  if (count[0].count >= limit) return false
  await db.insert(rateLimitEvents).values({ key, createdAt: new Date() })
  return true
}
```

**Schema — `rate_limit_events`:**

```ts
id          text        PK  (cuid2)
key         text        NOT NULL   -- e.g. "magic-link:email:user@example.com"
created_at  timestamp   NOT NULL  DEFAULT now()
```

Index on `(key, created_at)` for the sliding-window query. Rows older than 1 hour are pruned by the `CLEANUP_EXPIRED_INVITES` cron (or a dedicated rate-limit cleanup job). See [../JOBS.md](../JOBS.md).

---

## Technical Notes

### Error states

| Scenario | Handling |
|---|---|
| Invalid / expired magic link | Better Auth returns error → show "Link expired" page |
| Google OAuth cancelled | Redirect back to /signin with `?error=cancelled` |
| SMTP send failure | Log error server-side, return 500 to client, show toast |
| Session expired | Middleware catches → redirect /signin |
| Access to protected route without session | Middleware redirects to /signin |

### Security notes

- Magic link tokens are single-use and expire in **10 minutes**.
- Sessions expire in **30 days** and refresh every 24 hours.
- All auth routes go through `api/auth/[...all]` — never expose raw tokens to the client.
- `BETTER_AUTH_SECRET` must be a strong random value — never commit to git.
- Google OAuth redirect URI must exactly match the registered URI in Google Console.

### Google OAuth setup (for developers)

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Create a new project.
3. Enable the Google+ API.
4. Create OAuth 2.0 credentials.
5. Add authorized redirect URI: `{APP_URL}/api/auth/callback/google`.
6. Copy Client ID and Client Secret into `.env`.

Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` blank to disable Google sign-in — the button will not render.
