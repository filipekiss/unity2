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
