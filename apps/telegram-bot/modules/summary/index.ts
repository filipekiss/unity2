import chalk from "chalk";
import { and, desc, eq, gt, lte } from "drizzle-orm";
import { pipe } from "fp-ts/lib/function";
import { CommandContext, matchFilter } from "grammy";
import { oda, withNext } from "grammy-utils";
import { isAnyGroupChat } from "grammy-utils/filter-is-group";
import { chatGptClient } from "~/chatgpt/client";
import { db } from "~/db";
import {
  deleteMessage,
  escapeForMarkdown,
  lines,
  replyToSender,
  replyWithMessage,
  sendAsMarkdown,
  sendMessage,
} from "~/telegram/messages";
import { Unity2 } from "~/unity2";
import { isProduction, minutesInBetween, useEnvOrDefault } from "~/utils";
import { TableGeneratedSummaries, TableSummaryMessages } from "./schema";
import { limit } from "@grammyjs/ratelimiter";
import { MILLISECONDS } from "~/time";
import { parse } from "date-fns";

const debug = oda.module.extend("summary");

// You can configure this module using the env variables below.
const SUMMARY_EXPIRATION = Number(
  useEnvOrDefault("UNITY2_SUMMARY_EXPIRATION", MILLISECONDS.MINUTE * 30)
);
const SUMMARY_MESSAGE_COUNT = Number(
  useEnvOrDefault("UNITY2_SUMMARY_MESSAGES_COUNT", 100)
);
const SUMMARY_COMMAND_RATE_LIMIT = Number(
  useEnvOrDefault("UNITY2_SUMMARY_COMMAND_TIMEOUT", 15 * MILLISECONDS.SECOND)
);

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

const sendSummary = async <
  TContext extends CommandContext<Unity2.Context.With.User>
>(
  ctx: TContext
) => {
  if (!ctx.chat) {
    debug(`no chat id`);
    return;
  }
  debug("summary requested");

  const rogerismosChance = Math.random();
  if (rogerismosChance < 0.01) {
    await sendMessage("Rogério fez rogerismos")(ctx);
    return;
  }

  if (!isProduction()) {
    const now = Date.now();
    oda
      .fromObjectToLabeledMessage({
        valid_until: String(now + SUMMARY_EXPIRATION),
        created_at: String(now),
        SUMMARY_COMMAND_RATE_LIMIT,
        SUMMARY_MESSAGE_COUNT,
        SUMMARY_EXPIRATION,
      })
      .forEach((x) => oda.debug(x));
  }

  const chatKey = String(ctx.chat.id);
  debug(`checking for existing summary - chatKey ${chatKey}`);
  const maybeSummary = await db.query.summaries.findFirst({
    where: and(
      eq(TableGeneratedSummaries.chat_id, chatKey),
      gt(TableGeneratedSummaries.valid_until, String(Date.now()))
    ),
  });

  if (maybeSummary) {
    debug("found valid summary");
    let validMinutes = minutesInBetween(
      Date.now(),
      Number(maybeSummary.valid_until)
    );
    let validMinutesMessage = `Válido por mais *${validMinutes} minutos*`;
    if (validMinutes < 1) {
      validMinutesMessage = "Válido por menos de *1 minuto*";
    } else if (validMinutes === 1) {
      validMinutesMessage = "Válido por mais *1 minuto*";
    }
    await replyWithMessage(
      lines(
        escapeForMarkdown(maybeSummary.text),
        escapeForMarkdown(`*✶ ${validMinutesMessage.replaceAll(/./g, "─")}*`),
        escapeForMarkdown(`⏰ ${validMinutesMessage}`)
      ),
      {
        ...replyToSender(ctx.message!),
        ...sendAsMarkdown(),
      }
    )(ctx);

    return;
  }

  // }}}---
  // --{{{ Check if we can generate a new summary
  debug(
    `no valid summary found, looking for messages to summarize (${SUMMARY_MESSAGE_COUNT} messages)`
  );
  const messages = await db.query.summary_messages.findMany({
    where: and(
      eq(TableSummaryMessages.chat_id, chatKey),
      eq(TableSummaryMessages.is_summarized, false)
    ),
    limit: SUMMARY_MESSAGE_COUNT,
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

  try {
    const messagesText = messages
      .map((x) => x.message_text)
      .reverse()
      .join("\n");

    debug("querying chatgpt");
    const res = await chatGptClient.sendMessage(messagesText, {
      timeoutMs: MILLISECONDS.MINUTE * 2,
      systemMessage:
        "Vocé é um robô especialista em descobrir quais os principais assuntos de uma conversa. Trate cada linha como uma mensagem e identifique os tópicos discutidos. Faça um breve resumo de cada tópico discutido nas mensagens, usando um emoji pra identificar o assunto principal do tópico. Se um tópico foi mencionado poucas vezes, ele pode ser ignorado. Mantenha sua mensagem abaixo de 2000 caractes. Sempre que você for falar sobre um usuário, use uma dessas palavras em vez do termo 'Usuário' ou 'Usuários': 'Tchola', 'Twink', 'Mano', 'Animal'. Você pode usar essas palavras também no plural. Tente misturar e usar vários desses termos ao longo do seu resumo.",
    });
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

    debug(
      `saving summary message (expires at ${parse(
        String(Date.now() + SUMMARY_EXPIRATION),
        "T",
        new Date()
      )})`
    );
    await db.insert(TableGeneratedSummaries).values({
      chat_id: String(generatedSummaryMessage.chat.id),
      telegram_user_id: String(ctx.from.id),
      // Make it valid for one hour, in milliseconds
      valid_until: String(Date.now() + SUMMARY_EXPIRATION),
      created_at: String(Date.now()),
      text: res.text,
    });
  } catch (e) {
    debug("error when querying chatgpt");
    console.error(e);
    const feedbackMessageOne = await replyWithMessage(
      "Ocorreu um erro ao tentar gerar o resumo (provavelmente culpa do ChatGPT)",
      replyToSender(ctx.message)
    )(ctx);
    deleteMessage(feedbackMessageOne, MILLISECONDS.SECOND * 10);
    const feedbackMessageTwo = await replyWithMessage(
      "Tente novamente daqui há alguns minutos",
      replyToSender(ctx.message)
    )(ctx);
    deleteMessage(feedbackMessageTwo, MILLISECONDS.SECOND * 10);
  } finally {
    clearInterval(typingInterval);
    deleteMessage(summaryMessage);
  }

  // }}}---

  return;
};

SummaryModule.middleware
  .drop(matchFilter("::bot_command"))
  .filter(isAnyGroupChat)
  .on("message:text", withNext(addMessageToSummaryQueue));

const summaryCommand = SummaryModule.middleware
  .filter(isAnyGroupChat)
  .command("pauta", async (ctx, next) => {
    await sendSummary(ctx as CommandContext<Unity2.Context.With.User>);
    await next();
  });
if (isProduction()) {
  summaryCommand.use(
    limit({
      timeFrame: SUMMARY_COMMAND_RATE_LIMIT,
      limit: 1,
      onLimitExceeded: async (ctx) => {
        debug(`summary limit exceeded (${SUMMARY_COMMAND_RATE_LIMIT})`);
        await sendMessage(
          `Aguarde ${
            SUMMARY_COMMAND_RATE_LIMIT / MILLISECONDS.SECOND
          }s antes de pedir um novo resumo`
        )(ctx);
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
}

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
