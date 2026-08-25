import { DownloadIcon } from "@phosphor-icons/react/dist/ssr";
import { desc, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { session as sessionTable, user } from "@/db/schema";
import { db } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/orbit/feature-flags";
import { hasPassword } from "@/lib/users/password";
import { AccountIdentityForms, DeleteAccountForm } from "./account-forms";
import { PasswordForm } from "./password-form";
import { type SessionRow, SessionsCard } from "./sessions-card";

export async function AccountSettingsContent({
  userId,
  currentSessionToken,
}: {
  userId: string;
  currentSessionToken: string;
}) {
  const [freshUser, sessions, passwordEnabled, userHasPassword] =
    await Promise.all([
      db.query.user.findFirst({ where: eq(user.id, userId) }),
      db
        .select({
          createdAt: sessionTable.createdAt,
          expiresAt: sessionTable.expiresAt,
          id: sessionTable.id,
          ipAddress: sessionTable.ipAddress,
          token: sessionTable.token,
          userAgent: sessionTable.userAgent,
        })
        .from(sessionTable)
        .where(eq(sessionTable.userId, userId))
        .orderBy(desc(sessionTable.createdAt)),
      isFeatureEnabled("password_auth"),
      hasPassword(userId),
    ]);

  if (!freshUser) {
    return null;
  }

  const sessionRows: SessionRow[] = sessions.map((s) => ({
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    id: s.id,
    ipAddress: s.ipAddress,
    isCurrent: s.token === currentSessionToken,
    userAgent: s.userAgent,
  }));

  return (
    <div className="space-y-10">
      {/* Profile */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-ir-heading">Profile</h2>
          <p className="mt-0.5 text-xs text-ir-muted">
            Your display name and email address for this account.
          </p>
        </div>
        <AccountIdentityForms
          email={freshUser.email}
          image={freshUser.image}
          name={freshUser.name}
        />
      </section>

      {/* Password — only when this instance offers email + password sign-in;
          otherwise a password would be unusable and the section is noise. */}
      {passwordEnabled && <PasswordForm hasPassword={userHasPassword} />}

      {/* Active sessions */}
      <SessionsCard sessions={sessionRows} />

      {/* Export */}
      <section>
        <div className="rounded-ir-card border border-ir-border bg-ir-surface p-5 shadow-ir-xs">
          <div className="flex items-start gap-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-ir-sm bg-ir-muted-surface">
              <DownloadIcon className="size-4 text-ir-muted" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ir-heading">
                Export your data
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ir-muted">
                Download a JSON archive of everything we store: your profile,
                linked auth accounts, active sessions, and audit history.
              </p>
              <div className="mt-4">
                <Button asChild size="sm" variant="secondary">
                  <a download href="/api/account/export">
                    <DownloadIcon className="size-3.5" />
                    Download JSON export
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Delete account */}
      <DeleteAccountForm email={freshUser.email} />
    </div>
  );
}
