# IdeaRoads — Implementation Reference

> **This folder documents *how* IdeaRoads is built, not *what* it is.**
>
> The product specification lives in the parent `docs/` folder: [`README.md`](../README.md), [`MASTER.md`](../MASTER.md), [`PLATFORM.md`](../PLATFORM.md), and [`features/`](../features/). Those describe the product. The files here capture the technical decisions that support it.

| File | Contents |
|---|---|
| [TECH-STACK.md](TECH-STACK.md) | Tech stack, key dependencies, authentication implementation, key design decisions, environment variables |
| [DATABASE.md](DATABASE.md) | Full PostgreSQL schema, table summary, and schema-to-product-role mapping |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Route groups, URL patterns, folder structure, and engineering conventions |
| [JOBS.md](JOBS.md) | Background jobs (pg-boss) and outbound webhook events |
| [INTEGRATIONS.md](INTEGRATIONS.md) | Optional config (SMTP, Google OAuth, storage, webhooks): database vs. `.env` resolution, encryption, restart-required exceptions |

Anything in these files — table names, columns, file paths, function names, env vars, library choices — is an implementation detail. Product documentation refers to product concepts (Brand Admin, Team Member, User, Platform Admin, Workspace, Board, Feedback, Roadmap, Changelog) and links here when a technical detail is genuinely needed.
