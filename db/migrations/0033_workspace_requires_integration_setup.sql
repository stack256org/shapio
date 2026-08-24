-- Marks the single workspace created by the first-run `/setup` wizard as
-- blocked until its owner configures SMTP. Cleared by completeFirstRunSetupAction
-- once SMTP is confirmed configured. Workspaces created through the normal
-- onboarding flow never set this. See db/schema/workspaces.ts.
ALTER TABLE "workspaces" ADD COLUMN "requires_integration_setup" boolean DEFAULT false NOT NULL;
