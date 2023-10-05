import { migrate } from "drizzle-orm/libsql/migrator";
import { resolve } from "path";
import { db } from "~/db";

export async function migrateBot() {
  await migrate(db, {
    migrationsFolder: resolve(__dirname, "../migrations/"),
  });
}
