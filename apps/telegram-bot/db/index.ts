import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { DATABASE_URL, TURSO_TOKEN } from "~/constants";
import { TableReminders } from "~/modules/remind/schema";
import {
  TableGeneratedSummaries,
  TableSummaryMessages,
} from "~/modules/summary/schema";

export const dbInstance = createClient({
  url: DATABASE_URL,
  authToken: TURSO_TOKEN,
});

export const db = drizzle(dbInstance, {
  schema: {
    summary_messages: TableSummaryMessages,
    summaries: TableGeneratedSummaries,
    reminders: TableReminders,
  },
});
