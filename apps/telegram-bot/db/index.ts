import { Client, createClient } from "@libsql/client";
import { LibSQLDatabase, drizzle } from "drizzle-orm/libsql";
import { JSDocUnknownTag } from "typescript";
import { DATABASE_URL, TURSO_TOKEN } from "~/constants";
import { TableSummaryMessages } from "~/modules/summary/schema";

export const dbInstance = createClient({
  url: DATABASE_URL,
  authToken: TURSO_TOKEN,
});

export const db = drizzle(dbInstance, {
  schema: {
    summary_messages: TableSummaryMessages,
  },
});
