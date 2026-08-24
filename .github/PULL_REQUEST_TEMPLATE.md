<!--
Thanks for contributing. Please open an issue first for anything large, so we can
agree on the approach before you spend time on it.
-->

## What does this change?

<!-- One or two sentences. -->

## Why?

<!-- Link the issue this closes: "Closes #123". If there's no issue, explain the problem. -->

## How was it tested?

<!-- What did you actually run? "pnpm dev, created a post as a user, voted on it,
     confirmed the notification, checked the admin roadmap view." Be concrete. -->

## Checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Schema changed? Ran `pnpm db:generate` and committed the migration in `db/migrations/`
- [ ] New env var? Added to **both** `.env.example` and `.env.docker.example`
- [ ] Read `docs/MASTER.md` and the relevant `docs/features/*.md` spec before touching product behaviour
- [ ] UI change? Followed `DESIGN.md` / `DESIGN-SYSTEM.md` — reused existing components and design tokens rather than introducing a new pattern
- [ ] Dark mode still looks right, if applicable
- [ ] Docs in `docs/` updated if behaviour changed

## Screenshots

<!-- For any user-visible change. -->

## Breaking changes

<!-- Anything a self-hoster must do by hand when upgrading (new required env var, a
     manual data migration, a changed default). Write "None" if there are none. -->
