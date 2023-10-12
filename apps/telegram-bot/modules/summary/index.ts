import chalk from "chalk";
import { parse } from "date-fns";
import { and, desc, eq, gt, lte } from "drizzle-orm";
import { pipe } from "fp-ts/lib/function";
import { CommandContext, matchFilter } from "grammy";
import {
    oda,
    withNextMiddleware,
    responseTimeMiddleware as responseTimeMiddlewareConfig,
} from "grammy-utils";
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
import { MILLISECONDS } from "~/time";
import { Unity2 } from "~/unity2";
import { minutesInBetween, useEnvOrDefault } from "~/utils";
import { TableGeneratedSummaries, TableSummaryMessages } from "./schema";

const debug = oda.module.extend("summary");

type Timeout = {
  next_usage: number;
};

const timeoutMapping = new Map<string, Timeout>();

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

const SUMMARY_MINIMUM_MESSAGE_LENGTH = Number(
  useEnvOrDefault("UNITY2_MINIMUM_MESSAGE_LENGTH", 15)
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
    message_obj: ctx.message,
    from: ctx.from as Unity2.User,
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
  const chatKey = String(ctx.chat.id);
  debug(`checking command timeout (group ${chatKey})`);
  const now = Date.now();
  const groupTimeout = timeoutMapping.get(chatKey) ?? {
    next_usage: 0,
  };
  if (now < groupTimeout.next_usage) {
    debug.extend("ending")("command in timeout");
    timeoutMapping.set(chatKey, {
      ...groupTimeout,
    });
    return;
  }
  timeoutMapping.set(chatKey, {
    next_usage: now + SUMMARY_COMMAND_RATE_LIMIT,
  });

  debug("summary requested");

  const rogerismosChance = Math.random();
  if (rogerismosChance < 0.01) {
    await sendMessage("Rogério fez rogerismos")(ctx);
    return;
  }

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
        ...replyToSender(ctx.message as Unity2.Message),
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
  debug(`summarizing ${messages.length} messages`);
  const summaryMessage = await sendMessage("Gerando resumo")(ctx);
  try {
    const messagesText = messages
      .map((x) => x.message_text)
      .reverse()
      .join("\n");

    debug("querying chatgpt");
    const res = await chatGptClient.sendMessage(messagesText, {
      timeoutMs: MILLISECONDS.MINUTE * 2,
      systemMessage:
        "Vocé é um robô especialista em descobrir quais os principais assuntos de uma conversa. Trate cada linha como uma mensagem e identifique os tópicos discutidos. Faça um breve resumo de cada tópico discutido nas mensagens, usando um emoji pra identificar o assunto principal do tópico. Se um tópico foi mencionado poucas vezes, ele pode ser ignorado. Mantenha sua mensagem abaixo de 2000 caracteres",
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
    deleteMessage(summaryMessage);
  }

  // }}}---

  return;
};

const debugPredicate = (
  message: string,
  predicate: (ctx: Unity2.Context) => boolean | Promise<boolean>
) => {
  return async (ctx: Unity2.Context) => {
    const result = await predicate(ctx);
    if (result) {
      debug.extend("with")(message);
    }
    return result;
  };
};

const responseTimeMiddleware = responseTimeMiddlewareConfig(debug);

SummaryModule.middleware
  .drop(debugPredicate("dropping command", matchFilter("::bot_command")))
  .drop(debugPredicate("dropping spoiler", matchFilter("::spoiler")))
  .drop((ctx) => {
    if ((ctx.message?.text?.length ?? 0) < SUMMARY_MINIMUM_MESSAGE_LENGTH) {
      debug(`dropping short message (${ctx.message?.text?.length ?? 0})`);
      return true;
    }
    return false;
  })
  .filter(isAnyGroupChat)
  .use(responseTimeMiddleware("message"))
  .on("message:text", withNextMiddleware(addMessageToSummaryQueue));

SummaryModule.middleware
  .filter(isAnyGroupChat)
  .command("pauta", responseTimeMiddleware("command:pauta"))
  .command("pauta", async (ctx, next) => {
    await sendSummary(ctx as CommandContext<Unity2.Context.With.User>);
    await next();
  });

SummaryModule.middleware
  .drop(isAnyGroupChat)
  .use(responseTimeMiddleware("command"))
  .command(
    "pauta",
    withNextMiddleware((ctx) =>
      pipe(
        ctx,
        replyWithMessage("Esse comando só funciona em grupos", {
          ...replyToSender(ctx.message as Unity2.Message),
        })
      )
    )
  );
