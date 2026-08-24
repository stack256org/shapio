import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

// Load .env.test into this process now, so its values are available both to
// pass into `test.env` below (for test-runner workers) and to global-setup.ts
// (which also loads it independently, since globalSetup runs in its own
// process). Node's process.loadEnvFile never overrides an already-set var, so
// nothing here can be clobbered by a developer's real .env.
if (existsSync(".env.test")) {
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
