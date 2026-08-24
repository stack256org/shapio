import { account } from "@/db/schema";
import { db } from "@/lib/db";

async function main() {
  const rows = await db.select().from(account);
  console.log(
    rows.map((r) => ({
      userId: r.userId,
      providerId: r.providerId,
      hasPassword: !!r.password,
    }))
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
