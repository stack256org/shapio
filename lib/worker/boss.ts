import { eq } from "drizzle-orm";
import { type Job, PgBoss } from "pg-boss";
import { ADMIN_ROLE } from "@/config/platform";
import { featureFlags, user } from "@/db/schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { DEFAULT_FEATURE_FLAGS } from "@/lib/orbit/feature-flags";
import { normalizePgConnectionString } from "@/lib/pg-connection";
import { sleep } from "@/lib/utils";
import { ensureJobQueues } from "@/lib/worker/ensure-queues";
import { JOB_NAMES } from "@/lib/worker/job-types";

const boss = new PgBoss({
  connectionString: normalizePgConnectionString(env.DATABASE_URL),
});

export { boss };

function work<T>(name: string, handler: (jobs: Job<T>[]) => Promise<void>) {
  return boss.work<T>(name, { includeMetadata: true }, handler);
}

async function startBossWithRetry(maxRetries = 10) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await boss.start();
      console.log("[worker] pg-boss started");
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      const delay = Math.min(2000 * 2 ** (attempt - 1), 30_000);
      console.error(
        `[worker] pg-boss start failed (${attempt}/${maxRetries}); retrying in ${
          delay / 1000
        }s`,
        error
      );
      await sleep(delay);
    }
  }
}

export async function startWorker() {
  boss.on("error", (error) => {
    console.error("[worker] pg-boss error", error);
  });

  await startBossWithRetry();
  await ensureJobQueues(boss);

  const { handleEmailSend } = await import("@/lib/worker/handlers/email-send");
  const { handleEmailOutboxReap } = await import(
    "@/lib/worker/handlers/email-outbox-reap"
  );
  const { handleEmailEventsPrune } = await import(
    "@/lib/worker/handlers/email-events-prune"
  );
  const { handleScaffoldHealthcheck } = await import(
    "@/lib/worker/handlers/scaffold-healthcheck"
  );
  const { handleSendChangelogEmail } = await import(
    "@/lib/worker/handlers/send-changelog-email"
  );
  const { handleSendStatusChangeEmail } = await import(
    "@/lib/worker/handlers/send-status-change-email"
  );
  const { handleSendNewPostAlert } = await import(
    "@/lib/worker/handlers/send-new-post-alert"
  );
  const { handleSendPendingCommentAlert } = await import(
    "@/lib/worker/handlers/send-pending-comment-alert"
  );
  const { handleCleanupReadNotifications } = await import(
    "@/lib/worker/handlers/cleanup-read-notifications"
  );

  await Promise.all([
    work(JOB_NAMES.EMAIL_SEND, handleEmailSend),
    work(JOB_NAMES.EMAIL_OUTBOX_REAP, handleEmailOutboxReap),
    work(JOB_NAMES.EMAIL_EVENTS_PRUNE, handleEmailEventsPrune),
    work(JOB_NAMES.SCAFFOLD_HEALTHCHECK, handleScaffoldHealthcheck),
    work(JOB_NAMES.SEND_CHANGELOG_EMAIL, handleSendChangelogEmail),
    work(JOB_NAMES.SEND_STATUS_CHANGE_EMAIL, handleSendStatusChangeEmail),
    work(JOB_NAMES.SEND_NEW_POST_ALERT, handleSendNewPostAlert),
    work(JOB_NAMES.SEND_PENDING_COMMENT_ALERT, handleSendPendingCommentAlert),
    work(JOB_NAMES.CLEANUP_READ_NOTIFICATIONS, handleCleanupReadNotifications),
  ]);

  await boss.schedule(JOB_NAMES.EMAIL_OUTBOX_REAP, "*/15 * * * *", {});
  await boss.schedule(JOB_NAMES.EMAIL_EVENTS_PRUNE, "17 3 * * *", {});
  await boss.schedule(JOB_NAMES.SCAFFOLD_HEALTHCHECK, "*/10 * * * *", {});
  await boss.schedule(JOB_NAMES.CLEANUP_READ_NOTIFICATIONS, "0 3 * * *", {});

  console.log("[worker] handlers registered");

  await seedPlatformData();
}

async function seedPlatformData() {
  try {
    // Seed default feature flags (INSERT ON CONFLICT DO NOTHING)
    for (const flag of DEFAULT_FEATURE_FLAGS) {
      await db
        .insert(featureFlags)
        .values({
          key: flag.key,
          description: flag.description,
          isEnabled: flag.isEnabled,
        })
        .onConflictDoNothing();
    }

    // Seed superadmin from ORBIT_SEED_EMAIL if set
    if (env.ORBIT_SEED_EMAIL) {
      const email = env.ORBIT_SEED_EMAIL;
      const [existingUser] = await db
        .select({ id: user.id, role: user.role })
        .from(user)
        .where(eq(user.email, email))
        .limit(1);

      if (existingUser && existingUser.role !== ADMIN_ROLE) {
        await db
          .update(user)
          .set({ role: ADMIN_ROLE, updatedAt: new Date() })
          .where(eq(user.id, existingUser.id));
        console.log(`[worker] Seeded admin role for ${email}`);
      }
    }

    console.log("[worker] platform data seeded");
  } catch (error) {
    console.error("[worker] failed to seed platform data", error);
  }
}

export async function stopWorker() {
  await boss.stop({ graceful: true });
}
