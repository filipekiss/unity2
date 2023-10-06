import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const TableSummaryMessages = sqliteTable(
  "summary_messages",
  {
    id: integer("id").primaryKey(),
    chat_id: text("chat_id").notNull(),
    message_text: text("message_text").notNull(),
    is_summarized: integer("is_summarized", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (table) => {
    return {
      chatIndex: index("chat_id_idx").on(table.chat_id),
    };
  }
);

export const TableGeneratedSummaries = sqliteTable(
  "summaries",
  {
    id: integer("id").primaryKey(),
    chat_id: text("chat_id").notNull(),
    telegram_user_id: text("telegram_user_id").notNull(),
    created_at: text("created_at")
      .default(sql`CURRENT_TIME`)
      .notNull(),
    valid_until: text("valid_until").notNull(),
    text: text("text").notNull(),
  },
  (table) => {
    return {
      chatIndex: index("summary_chat_id_idx").on(table.chat_id),
    };
  }
);
