import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

// Load .env.test into this process now, so its values are available both to
// pass into `test.env` below (for test-runner workers) and to global-setup.ts
// (which also loads it independently, since globalSetup runs in its own
// process).
//
// Node's process.loadEnvFile never overrides an already-set var, so these
// keys are cleared first — this suite owns a dedicated ephemeral database
// end-to-end (see global-setup.ts) and must always use .env.test's values for
// it, even when the parent process already has its own DATABASE_URL /
// APP_SECRET / etc. set (e.g. CI's `build` job sets those at the job level,
// as a placeholder for the unrelated `next build` step, and they'd otherwise
// leak into this env and point global-setup's embedded Postgres at a
// different port than drizzle-test.config.ts pushes the schema to).
const TEST_ENV_KEYS = [
  "DATABASE_URL",
  "APP_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "NODE_ENV",
  "ENCRYPTION_KEY",
];
if (existsSync(".env.test")) {
  for (const key of TEST_ENV_KEYS) {
    delete process.env[key];
  }
  process.loadEnvFile(".env.test");
}

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/setup/global-setup.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      APP_SECRET: process.env.APP_SECRET,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NODE_ENV: "test",
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});
