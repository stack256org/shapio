import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile();
}
const { db, dbClient } = await import("@/lib/db");
const { user } = await import("@/db/schema");
const rows = await db
  .select({ email: user.email, role: user.role, banned: user.banned })
  .from(user);
console.log("platform user roles (user.role) — Orbit needs exactly 'admin':");
for (const r of rows) {
  console.log(
    `  ${r.email}  role=${JSON.stringify(r.role)}  banned=${r.banned}`
  );
}
console.log("\ncount by role:");
const by = {};
for (const r of rows) {
  by[r.role] = (by[r.role] ?? 0) + 1;
}
console.log(" ", JSON.stringify(by));
await dbClient.end();
