import type { Config } from "drizzle-kit";
import { resolve } from "path";
import { DATABASE_URL, TURSO_TOKEN } from "./constants";
import { oda } from "grammy-utils";

const d = oda.debug.extend("dump");

d("DATABASE_URL: %s", DATABASE_URL);
d("TURSO_TOKEN: %s", TURSO_TOKEN);

export const config = {
  schema: [resolve(__dirname, "./**/schema.ts")],
  out: "./migrations",
  driver: "turso",
  dbCredentials: {
    url: DATABASE_URL,
    authToken: TURSO_TOKEN,
  },
  verbose: true,
} satisfies Config;

export default config;
