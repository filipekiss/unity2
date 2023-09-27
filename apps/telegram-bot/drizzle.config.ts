import type { Config } from "drizzle-kit";
import { resolve } from "path";
import { DATABASE_URL } from "./constants";

export const config = {
  schema: [resolve(__dirname, "./**/schema.ts")],
  out: "./migrations",
  driver: "better-sqlite",
  dbCredentials: {
    url: DATABASE_URL,
  },
  verbose: true,
} satisfies Config;

export default config;
