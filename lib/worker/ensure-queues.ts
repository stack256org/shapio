import type { PgBoss } from "pg-boss";
import { JOB_NAMES, type JobName } from "@/lib/worker/job-types";

type QueuePolicy = "standard" | "short" | "singleton" | "stately" | "exclusive";

export const QUEUE_OPTIONS: Record<
  JobName,
  {
    expireInSeconds?: number;
    policy?: QueuePolicy;
    retryDelay?: number;
    retryLimit?: number;
  }
> = {
  [JOB_NAMES.EMAIL_SEND]: {
    expireInSeconds: 300,
    policy: "standard",
    retryLimit: 0,
  },
  [JOB_NAMES.EMAIL_OUTBOX_REAP]: {
    expireInSeconds: 300,
    policy: "exclusive",
    retryLimit: 0,
  },
  [JOB_NAMES.EMAIL_EVENTS_PRUNE]: {
    expireInSeconds: 300,
    policy: "exclusive",
    retryLimit: 0,
  },
  [JOB_NAMES.SCAFFOLD_HEALTHCHECK]: {
    expireInSeconds: 120,
    policy: "exclusive",
    retryLimit: 1,
  },
  [JOB_NAMES.SEND_CHANGELOG_EMAIL]: {
    expireInSeconds: 3600,
    policy: "standard",
    retryLimit: 3,
  },
  [JOB_NAMES.SEND_STATUS_CHANGE_EMAIL]: {
    expireInSeconds: 3600,
    policy: "standard",
    retryLimit: 3,
  },
  [JOB_NAMES.SEND_NEW_POST_ALERT]: {
    expireInSeconds: 3600,
    policy: "standard",
    retryLimit: 3,
  },
  [JOB_NAMES.SEND_PENDING_COMMENT_ALERT]: {
    expireInSeconds: 3600,
    policy: "standard",
    retryLimit: 3,
  },
  [JOB_NAMES.CLEANUP_READ_NOTIFICATIONS]: {
    expireInSeconds: 300,
    policy: "exclusive",
    retryLimit: 0,
  },
};

export async function ensureJobQueues(boss: PgBoss) {
  for (const [name, options] of Object.entries(QUEUE_OPTIONS)) {
    await boss.createQueue(name, options);
  }
}
