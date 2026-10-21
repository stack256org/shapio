-- Better Auth 1.7 only accepts a credential account for sign-in when
-- account.account_id equals the user's id. The first-run `/setup` wizard used
-- to store the admin's email there, which 1.7 rejects as "invalid email or
-- password". The wizard now stores the user id (app/actions/setup.ts); this
-- repairs rows it already wrote. Idempotent: rows that already match are left
-- alone, and each user has at most one credential account.
UPDATE "account"
SET "account_id" = "user_id"
WHERE "provider_id" = 'credential'
  AND "account_id" <> "user_id";
