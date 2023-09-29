import chalk from "chalk";
import { CommandContext, Composer, Context, matchFilter } from "grammy";
import { oda, withNext } from "grammy-utils";
import { isAnyGroupChat } from "grammy-utils/filter-is-group";
import { Message } from "grammy/types";
import { summaryMessagesTable } from "./schema";
import { flow } from "fp-ts/lib/function";
import { contextReply } from "~/telegram/messages";
import { and, eq } from "drizzle-orm";
import { getDbInstance } from "~/db";
import { drizzle } from "drizzle-orm/libsql";

const messagesDB = drizzle(getDbInstance(), {
  schema: {
    summary_messages: summaryMessagesTable,
  },
});

export const SummaryModule = new Composer();

type ContextWithTextMessage = Context & { message: Message & { text: string } };

async function addMessageToSummaryQueue<T extends ContextWithTextMessage>(
  ctx: T
) {
  if (!ctx.chat) {
    oda.bot(`no chat id`);
    return;
  }
  oda.bot(
    `adding text message to summary - ${chalk.blue(ctx.message.message_id)}`
  );
  const chatKey = String(ctx.chat.id);
  await messagesDB.insert(summaryMessagesTable).values({
    chat_id: chatKey,
    message_text: ctx.message.text,
  });
}

SummaryModule.drop(matchFilter("::bot_command"))
  .filter(isAnyGroupChat)
  .on("message:text", withNext(addMessageToSummaryQueue));

const sendSummary = async (ctx: CommandContext<Context>) => {
  if (!ctx.chat) {
    oda.bot(`no chat id`);
    return;
  }
  const chatKey = String(ctx.chat.id);
  const messages = await messagesDB.query.summary_messages.findMany({
    where: and(
      eq(summaryMessagesTable.chat_id, chatKey),
      eq(summaryMessagesTable.is_summarized, false)
    ),
  });
  if (messages?.length === 0) {
    return contextReply("Sem mensagens pra fazer um resumo")(ctx);
  }
  if (messages.length < 20) {
    return contextReply("Sem mensagens suficientes pra fazer um resumo")(ctx);
  }
  return contextReply([...messages!].map((m) => m.message_text).join("\n"))(
    ctx
  );
};

SummaryModule.filter(isAnyGroupChat).command("pauta", withNext(sendSummary));
SummaryModule.drop(isAnyGroupChat).command(
  "pauta",
  withNext(flow(contextReply("Esse comando só funciona em grupos")))
);
