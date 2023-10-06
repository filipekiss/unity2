import chalk from "chalk";
import { and, desc, eq, lte } from "drizzle-orm";
import { pipe } from "fp-ts/lib/function";
import { CommandContext, matchFilter } from "grammy";
import { oda, withNext } from "grammy-utils";
import { isAnyGroupChat } from "grammy-utils/filter-is-group";
import { chatGptClient } from "~/chatgpt/client";
import { db } from "~/db";
import {
  deleteMessage,
  replyToSender,
  replyWithMessage,
  sendMessage,
} from "~/telegram/messages";
import { Unity2 } from "~/unity2";
import { minutesInBetween } from "~/utils";
import { TableGeneratedSummaries, TableSummaryMessages } from "./schema";
import { limit } from "@grammyjs/ratelimiter";

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

const sendSummary = async <
  TContext extends CommandContext<Unity2.Context.With.User>
>(
  ctx: TContext
) => {
  if (!ctx.chat) {
    debug(`no chat id`);
    return;
  }
  oda
    .fromObjectToLabeledMessage({
      valid_until: String(Date.now() + 1000 * 60 * 60),
      created_at: String(Date.now()),
    })
    .forEach((x) => oda.debug(x));
  const chatKey = String(ctx.chat.id);
  debug(`checking for existing summary - chatKey ${chatKey}`);
  const hasValidSummary = await db.query.summaries.findFirst({
    where: eq(TableGeneratedSummaries.chat_id, chatKey),
  });

  if (hasValidSummary) {
    debug("found valid summary");
    await replyWithMessage(
      `Um resumo foi encontrado. Ele é válido por mais ${minutesInBetween(
        Date.now(),
        Number(hasValidSummary.valid_until)
      )} minuto(s): \n\n${hasValidSummary.text}`,
      replyToSender(ctx.message!)
    )(ctx);

    return;
  }

  // }}}---
  // --{{{ Check if we can generate a new summary
  const messages = await db.query.summary_messages.findMany({
    where: and(
      eq(TableSummaryMessages.chat_id, chatKey),
      eq(TableSummaryMessages.is_summarized, false)
    ),
    limit: 100,
    orderBy: [desc(TableSummaryMessages.id)],
  });

  if (messages?.length === 0) {
    debug.extend("ending")("no messages to summarize");
    return replyWithMessage(
      "Sem mensagens pra fazer um resumo",
      replyToSender(ctx.message)
    )(ctx);
  }

  const summaryMessage = await sendMessage("Gerando resumo")(ctx);
  const typingInterval = setInterval(async () => {
    await ctx.replyWithChatAction("typing");
  }, 5_000);

  const messagesText = messages
    .map((x) => x.message_text)
    .reverse()
    .join("\n");

  debug("querying chatgpt");
  const res = await chatGptClient.sendMessage(messagesText, {
    systemMessage:
      "Vocé é um robô especialista em descobrir quais os principais assuntos de uma conversa. Trate cada linha como uma mensagem e identifique os tópicos discutidos. Faça um breve resumo de cada tópico discutido nas mensagens, usando um emoji pra identificar o assunto principal do tópico. Se um tópico foi mencionado poucas vezes, ele pode ser ignorado. Mantenha sua mensagem abaixo de 2000 caractes.",
  });

  clearInterval(typingInterval);
  deleteMessage(summaryMessage);

  // }}}---

  const [lastMessage] = messages;

  debug("updating messages as summarized");
  await db
    .update(TableSummaryMessages)
    .set({
      is_summarized: true,
    })
    .where(lte(TableSummaryMessages.id, lastMessage.id));

  debug("sending summary message");

  const generatedSummaryMessage = await replyWithMessage(res.text, {
    ...replyToSender(ctx.message as Unity2.Message),
  })(ctx);

  await db.insert(TableGeneratedSummaries).values({
    chat_id: String(generatedSummaryMessage.chat.id),
    telegram_user_id: String(ctx.from.id),
    // Make it valid for one hour, in milliseconds
    valid_until: String(Date.now() + 1000 * 60 * 60),
    created_at: String(Date.now()),
    text: res.text,
  });

  return;
};

SummaryModule.middleware
  .filter(isAnyGroupChat)
  .command("pauta", async (ctx, next) => {
    await sendSummary(ctx as CommandContext<Unity2.Context.With.User>);
    await next();
  })
  .use(
    limit({
      timeFrame: 15 * 1_000,
      limit: 1,
      onLimitExceeded: async (ctx) => {
        debug("summary limit exceeded");
        await sendMessage("Aguarde 15s antes de pedir um novo resumo")(ctx);
      },
      keyGenerator: (ctx) => {
        if (ctx.hasChatType(["group", "supergroup"])) {
          return ctx.chat.id.toString();
        }
        if (ctx.hasChatType("private")) {
          return ctx.from.id.toString();
        }
      },
    })
  );

SummaryModule.middleware.drop(isAnyGroupChat).command(
  "pauta",
  withNext((ctx) =>
    pipe(
      ctx,
      replyWithMessage("Esse comando só funciona em grupos", {
        ...replyToSender(ctx.message as Unity2.Message),
      })
    )
  )
);
