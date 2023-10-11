import { migrate } from "drizzle-orm/libsql/migrator";
import { resolve } from "path";
import { db } from "~/db";
import { isProduction } from "~/utils";

export async function migrateBot() {
  await migrate(db, {
    migrationsFolder: resolve(__dirname, "../migrations/"),
  });
}

if (process.argv[2] === "run" && !isProduction()) {
  (async () => {
    await migrateBot();
  })();
}
