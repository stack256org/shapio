# IdeaRoads — Database Schema

> **Implementation reference — not product specification.**
> This is the canonical schema for the IdeaRoads MVP. Product behaviour is described in the product docs; this file documents the persistence layer only. Feature files do **not** duplicate schema — they link here.
>
> **MVP scope note.** In the MVP, voting and commenting **require a signed-in User** — there is no anonymous participation (see [`../PLATFORM.md`](../PLATFORM.md)). The email/name columns on `votes` and `comments` (`user_email`, `user_name`, `author_email`, `author_name`) and the related email-based unique index support a possible future anonymous-participation capability; they are **not exercised by the MVP**.

---

## Tables Summary

| Table | Description |
|---|---|
| `user` | Better Auth managed |
| `session` | Better Auth managed |
| `account` | Better Auth managed (OAuth providers) |
| `verification` | Better Auth managed (magic link tokens) |
| `workspaces` | Workspace records with moderation settings |
| `workspace_members` | User ↔ workspace with role |
| `workspace_invites` | Email invitations to a workspace |
| `workspace_invite_links` | Shareable, reusable invite links |
| `boards` | Feedback boards (workspace-scoped) |
| `categories` | Post categories (workspace-scoped, with color) |
| `workspace_statuses` | Customisable per-workspace post statuses |
| `posts` | Feedback posts with denormalised counters |
| `votes` | User votes on posts |
| `comments` | Threaded comments with soft delete |
| `comment_reactions` | Emoji reactions on comments |
| `changelog_entries` | Changelog entries (Markdown, draft/published) |
| `changelog_posts` | Junction table — changelog entry ↔ posts |
| `notifications` | In-app notifications for signed-in users |
| `notification_preferences` | Per-user email / in-app notification opt-outs |
| `blocked_users` | Users blocked from a workspace |
| `audit_logs` | Admin action history (workspace + platform level) |
| `email_outbox` | Durable email queue — written first, ensures zero email loss on crash |
| `email_events` | Inbound provider delivery/bounce webhook events |
| `job_logs` | Background-job execution logs |
| `outbound_webhook_endpoints` | Customer-registered HTTPS endpoints for workspace events |
| `outbound_webhook_deliveries` | Per-attempt delivery log with status + response (30-day retention) |
| `api_keys` | Workspace-scoped REST API keys (SHA-256 hashed, never stored raw) |
| `workspace_embed_config` | Per-workspace embed widget appearance (one row per workspace) |
| `feature_flags` | Platform-wide boolean feature toggles |
| `platform_settings` | Singleton operator config (signup, limits, maintenance mode) |

---

## Full Schema

```sql
-- Better Auth (managed by Better Auth internals)
user                id, name, email, email_verified, image, created_at, updated_at
session             id, user_id, token, expires_at, ip_address, user_agent, created_at
account             id, user_id, account_id, provider_id, access_token, password, created_at
verification        id, identifier, value, expires_at, created_at

-- Workspaces
workspaces          id, slug, name, description, logo_url, owner_id,
                    roadmap_public, changelog_public,
                    moderation_mode (off|auto|manual),
                    comment_moderation, spam_keywords[],
                    is_suspended, suspended_at, suspended_by,
                    created_at, updated_at

workspace_members   id, workspace_id, user_id,
                    role (owner|admin|member), joined_at
                    UNIQUE(workspace_id, user_id)

workspace_invites   id, workspace_id, invited_by_id, email, role,
                    token, expires_at, accepted_at, revoked_at, revoked_by_id, created_at

workspace_invite_links  id, workspace_id, created_by_id, role, token, label,
                        max_uses, use_count, expires_at, is_active,
                        created_at, updated_at

-- Boards
boards              id, slug, name, description, workspace_id,
                    is_public, is_archived, display_order,
                    created_by, created_at, updated_at
                    UNIQUE(workspace_id, slug)

-- Categories
categories          id, slug, name, color, workspace_id, created_at, updated_at
                    UNIQUE(workspace_id, slug)
                    UNIQUE(workspace_id, name)

-- Post statuses (customisable per workspace)
workspace_statuses  id, workspace_id, name, slug, color, display_order,
                    is_default, is_archived, created_at, updated_at
                    UNIQUE(workspace_id, slug)

-- Posts
posts               id, slug, title, description, status (pgEnum),
                    vote_count, comment_count,
                    board_id, workspace_id,
                    author_id, author_email, author_name,
                    category_id, is_pinned, is_locked, is_approved,
                    created_at, updated_at

-- Votes
votes               id, post_id, workspace_id,
                    user_id, user_email, user_name, created_at
                    -- Partial unique indexes (raw SQL migration):
                    -- UNIQUE (post_id, user_id) WHERE user_id IS NOT NULL
                    -- UNIQUE (post_id, user_email) WHERE user_email IS NOT NULL

-- Comments
comments            id, post_id, parent_id, body,
                    author_id, author_email, author_name, author_avatar,
                    is_deleted, is_approved, created_at, updated_at,
                    merged_from_post_id -- set only on the auto-generated merge-summary comment (see Feature 05)

comment_reactions   id, comment_id, user_id, emoji, created_at

-- Changelog
changelog_entries   id, workspace_id, title, body,
                    label (new_feature|improvement|bug_fix|security|deprecation),
                    is_published, published_at, notified_at,
                    created_by, created_at, updated_at

changelog_posts     changelog_entry_id, post_id   -- composite PK

-- Notifications
notifications       id, user_id, workspace_id, type, title, body,
                    link, is_read, created_at

notification_preferences  user_id (PK), email_status_change, email_new_comment,
                          email_changelog, in_app_status_change,
                          in_app_new_comment, in_app_changelog, updated_at
                          -- Opt-out model: a missing row means all notifications enabled

-- Email
email_outbox        id, to_email, subject, html_body,
                    status (queued|sending|sent|failed),
                    attempts, last_error, created_at, updated_at
                    -- Durable queue: insert row first, then enqueue SEND_EMAIL job
                    -- Worker atomically transitions: queued → sending → sent|failed
                    -- Survives app crashes between enqueue and send

email_events        id, provider_event_id, event_type, provider_email_id,
                    recipient, payload (jsonb), occurred_at, received_at
                    -- Inbound delivery/bounce/complaint webhooks from the email provider

-- Moderation
blocked_users       id, workspace_id, user_id, user_email, user_name,
                    blocked_by, reason, created_at
                    -- UNIQUE(workspace_id, user_id) WHERE user_id IS NOT NULL
                    -- UNIQUE(workspace_id, user_email) WHERE user_email IS NOT NULL

audit_logs          id, workspace_id, actor_id, actor_name,
                    action, entity_type, entity_id, entity_name,
                    metadata (jsonb), created_at
                    -- workspace_id nullable for platform-level (Orbit) actions
                    -- Fire-and-forget: createAuditLog() is never awaited

-- Outbound Webhooks
outbound_webhook_endpoints   id, workspace_id, url, encrypted_secret,
                             events (text[]), is_enabled,
                             consecutive_failures, disabled_reason,
                             created_at, updated_at

outbound_webhook_deliveries  id, endpoint_id, event, payload (jsonb),
                             status (pending|delivered|failed),
                             attempts, response_status, last_error,
                             created_at

-- API Keys
api_keys            id, workspace_id, user_id, name,
                    token_hash,   -- SHA-256 of the raw key, never stored in plaintext
                    last_used_at, is_enabled, created_at

-- Embed Widget
workspace_embed_config  workspace_id (PK), mode (inline|button),
                        position (bottom-right|bottom-left|top-right|top-left),
                        theme (light|dark|auto), width, height,
                        accent_color, updated_at

-- Platform Admin
-- There is no `superadmins` table. The Platform Admin product role is backed by
-- the `user.role` column (value `admin`); a normal end user has `user.role = user`.
feature_flags       id, key UNIQUE, is_enabled, description, created_at, updated_at

platform_settings   id (always 1, singleton),
                    signup_enabled, max_workspaces_per_user,
                    maintenance_mode, updated_at

-- Background jobs
job_logs            id, job_id, job_name, entity_type, entity_id, sequence,
                    level (info|warn|error), message, stdout, stderr,
                    started_at, finished_at, duration_ms, created_at
```

---

## Schema ↔ Product Role Mapping

The `workspace_members.role` column stores `owner | admin | member`. These are **internal values only**. In product terms:

| DB `role` value | Product role |
|---|---|
| `owner` | Brand Admin (the workspace owner) |
| `admin` | Brand Admin |
| `member` | Team Member |

The **Platform Admin** product role is backed by the `user.role` column (value `admin`) — there is no separate `superadmins` table. Public end users (**User**) have a `user` row (with `role = user`) but never a `workspace_members` row.
