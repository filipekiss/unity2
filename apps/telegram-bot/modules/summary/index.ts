import chalk from "chalk";
import { and, desc, eq, lte } from "drizzle-orm";
import { pipe } from "fp-ts/lib/function";
import { matchFilter } from "grammy";
import { oda, withNext } from "grammy-utils";
import { isAnyGroupChat } from "grammy-utils/filter-is-group";
import { chatGptClient } from "~/chatgpt/client";
import { db } from "~/db";
import {
  contextReply,
  deleteMessage,
  replyToSender,
} from "~/telegram/messages";
import { Unity2 } from "~/unity2";
import { TableSummaryMessages } from "./schema";

const debug = oda.module.extend("summary");

export const SummaryModule = Unity2.createModule("Summary");

async function addMessageToSummaryQueue(ctx: Unity2.Context.With.TextMessage) {
  if (!ctx.chat) {
    debug(`no chat id`);
    return;
  }
  debug(
    `adding text message to summary - ${chalk.blue(ctx.message.message_id)}`
  );
  const chatKey = String(ctx.chat.id);
  await db.insert(TableSummaryMessages).values({
    chat_id: chatKey,
    message_text: ctx.message.text,
  });
}

SummaryModule.middleware
  .drop(matchFilter("::bot_command"))
  .filter(isAnyGroupChat)
  .on("message:text", withNext(addMessageToSummaryQueue));

const sendSummary = async <TContext extends Unity2.Context>(ctx: TContext) => {
  if (!ctx.chat) {
    debug(`no chat id`);
    return;
  }
  const chatKey = String(ctx.chat.id);
  const messages = await db.query.summary_messages.findMany({
    where: and(
      eq(TableSummaryMessages.chat_id, chatKey),
      eq(TableSummaryMessages.is_summarized, false)
    ),
    limit: 100,
    orderBy: [desc(TableSummaryMessages.id)],
  });
  if (messages?.length === 0) {
    return contextReply("Sem mensagens pra fazer um resumo")(ctx);
  }

  const [lastMessage] = messages;

  const messagesText = messages
    .map((x) => x.message_text)
    .reverse()
    .join("\n");

  const summaryMessage = await contextReply("Gerando resumo")(ctx);
  const typingInterval = setInterval(async () => {
    await ctx.replyWithChatAction("typing");
  }, 5_000);

  const res = await chatGptClient.sendMessage(messagesText, {
    systemMessage:
      "Vocé é um robô especialista em descobrir quais os principais assuntos de uma conversa. Trate cada linha como uma mensagem e identifique os tópicos discutidos. Faça um breve resumo de cada tópico discutido nas mensagens, usando um emoji pra identificar o assunto principal do tópico. Se um tópico foi mencionado poucas vezes, ele pode ser ignorado. Mantenha sua mensagem abaixo de 2000 caractes.",
  });

  clearInterval(typingInterval);

  await deleteMessage(summaryMessage);

  // mark all messages as summarized so we can ignore them in the next summary
  await db
    .update(TableSummaryMessages)
    .set({
      is_summarized: true,
    })
    .where(lte(TableSummaryMessages.id, lastMessage.id));

  await contextReply(res.text, {
    ...replyToSender(ctx.message as Unity2.Message),
  })(ctx);

  return;
};

SummaryModule.middleware
  .filter(isAnyGroupChat)
  .command("pauta", async (ctx, next) => {
    await sendSummary(ctx);
    await next();
  });
SummaryModule.middleware.drop(isAnyGroupChat).command(
  "pauta",
  withNext((ctx) =>
    pipe(
      ctx,
      contextReply("Esse comando só funciona em grupos", {
        ...replyToSender(ctx.message as Unity2.Message),
      })
    )
  )
);
