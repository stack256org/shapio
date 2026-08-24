# IdeaRoads — Background Jobs & Webhooks

> **Implementation reference — not product specification.**
> Background job queue (pg-boss) and outbound webhook delivery. For product behaviour, see the product docs.

---

## Background Jobs (pg-boss)

Every job **must** have an entry in `QUEUE_OPTIONS` in `lib/worker/startup.ts` with explicit config:

```ts
QUEUE_OPTIONS[JOB_NAMES.SEND_EMAIL] = {
  retryLimit: 3,
  expireInHours: 1,
  policy: undefined,       // on-demand, parallel
}

QUEUE_OPTIONS[JOB_NAMES.CLEANUP_EXPIRED_INVITES] = {
  retryLimit: 1,
  expireInHours: 6,
  policy: "exclusive",     // cron — only one worker at a time
}
```

| Job | Trigger | Handler | Queue Policy |
|---|---|---|---|
| `SEND_EMAIL` | `enqueueEmail()` called | Process `email_outbox` row → Nodemailer SMTP | on-demand, retry 3 |
| `SEND_WORKSPACE_INVITE_EMAIL` | Member invited | Render + enqueue to `email_outbox` | on-demand, retry 3 |
| `SEND_MEMBER_REMOVED_EMAIL` | Member removed | Render + enqueue to `email_outbox` | on-demand, retry 3 |
| `SEND_WORKSPACE_DELETED_EMAIL` | Workspace deleted | Render + enqueue to `email_outbox` | on-demand, retry 3 |
| `SEND_NEW_POST_ALERT` | Post submitted | Notify workspace admins | on-demand, retry 3 |
| `SEND_STATUS_CHANGE_EMAIL` | Post status changed | Notify all voters (1 job per voter) | on-demand, retry 3 |
| `SEND_NEW_COMMENT_EMAIL` | Comment added | Notify post author | on-demand, retry 3 |
| `SEND_COMMENT_REPLY_EMAIL` | Reply added | Notify parent commenter | on-demand, retry 3 |
| `SEND_CHANGELOG_EMAIL` | Entry published | Notify voters of linked posts | on-demand, retry 3 |
| `DELIVER_OUTBOUND_WEBHOOK` | Workspace event | HMAC-sign + POST to endpoint (5 attempts) | on-demand, retry 5 |
| `CLEANUP_EXPIRED_INVITES` | Cron — 2am daily | Delete expired `workspace_invites` rows | exclusive cron |
| `CLEANUP_READ_NOTIFICATIONS` | Cron — 3am daily | Delete read notifications >90 days old | exclusive cron |
| `CLEANUP_EMAIL_OUTBOX` | Cron — 4am daily | Prune sent `email_outbox` rows >30 days | exclusive cron |
| `CLEANUP_WEBHOOK_DELIVERIES` | Cron — 4am daily | Prune `outbound_webhook_deliveries` rows >30 days | exclusive cron |

---

## Outbound Webhook Events

Events dispatched to customer-registered endpoints:

| Event | Trigger |
|---|---|
| `post.created` | New post submitted (and approved) |
| `post.status_changed` | Post status updated |
| `post.merged` | Post merged into another |
| `post.deleted` | Post deleted |
| `comment.created` | New comment added |
| `vote.cast` | Vote cast on a post |
| `member.joined` | New member joined workspace |
| `member.removed` | Member removed from workspace |
| `changelog.published` | Changelog entry published |

**Delivery:** HMAC-SHA256 signed payload, header `X-IdeaRoads-Signature: t=<unix>,v1=<hmac>`. Auto-disabled at 50 consecutive failures. 30-day delivery log retention.

**SSRF Protection:** All endpoint URLs validated on every delivery — RFC 1918, loopback, link-local, and IPv6 ULA ranges blocked.
