import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Truncates every table in the public schema between tests. Table names are
// discovered from information_schema rather than hardcoded, so this never
// drifts out of sync as the schema evolves.
export async function resetDb(): Promise<void> {
  const rows = await db.execute<{ tablename: string }>(sql`
    select tablename from pg_tables where schemaname = 'public'
  `);
  const tables = rows.map((r) => `"${r.tablename}"`).join(", ");
  if (!tables) {
    return;
  }
  await db.execute(
    sql.raw(`truncate table ${tables} restart identity cascade`)
  );
}
