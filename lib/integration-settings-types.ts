/**
 * Shared with app/actions/integration-settings.ts and its client components.
 * Kept out of the "use server" actions file itself — a Next.js Server
 * Actions module may only export async functions, so a plain constant or
 * type here would break the whole module (silently, as "no exports found").
 */

/**
 * Sentinel a form submits for a secret field that wasn't touched — "keep
 * whatever is already saved." Distinguishes "leave it alone" from "" (clear
 * it), so re-saving a form never requires re-entering a secret that's
 * already set, and the client never needs to see the real value to submit
 * it back unchanged.
 */
export const UNCHANGED_SECRET = "__unchanged__";

// Status — safe to send to the client. Non-secret fields show the currently
// EFFECTIVE value (DB row wins, .env is the fallback) so an admin edits on
// top of what's actually active. Secret fields never leave the server as
// plaintext — only a `has<Field>` boolean and, when the value currently
// comes from .env rather than the database, a hint saying so.
export interface IntegrationSettingsStatus {
  google: {
    clientId: string;
    hasClientSecret: boolean;
    clientSecretFromEnv: boolean;
  };
  smtp: {
    host: string;
    port: number | null;
    user: string;
    from: string;
    hasPass: boolean;
    passFromEnv: boolean;
  };
  storage: {
    region: string;
    bucket: string;
    accessKeyId: string;
    endpoint: string;
    publicUrlBase: string;
    localDir: string;
    hasSecretAccessKey: boolean;
    secretAccessKeyFromEnv: boolean;
  };
  webhook: {
    hasSecret: boolean;
    secretFromEnv: boolean;
  };
}
