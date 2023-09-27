import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { resolve } from "path";
import { getDbInstance } from "~/db";

const db = drizzle(getDbInstance());
migrate(db, {
  migrationsFolder: resolve(__dirname, "../migrations/"),
});
