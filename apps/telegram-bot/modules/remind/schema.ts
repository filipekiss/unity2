import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { Unity2 } from "~/unity2";

export const TableReminders = sqliteTable("reminders", {
  id: integer("id").primaryKey(),
  chat_id: text("chat_id").notNull(),
  from: text("from", { mode: "json" })
    .notNull()
    .default("{}")
    .$type<Unity2.User>(),
  message_obj: text("message_obj", { mode: "json" })
    .notNull()
    .default("{}")
    .$type<Unity2.Message.Reply>(),
  remind_at: text("remind_at").notNull(),
  from_id: text("from_id").notNull(),
  is_reminded: integer("is_reminded", { mode: "boolean" })
    .notNull()
    .default(false),
});
