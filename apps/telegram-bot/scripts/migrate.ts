import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { resolve } from "path";
import { getDbInstance } from "~/db";

export async function migrateBot() {
  const db = drizzle(getDbInstance());
  await migrate(db, {
    migrationsFolder: resolve(__dirname, "../migrations/"),
  });
}
