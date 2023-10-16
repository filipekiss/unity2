import {
  differenceInMinutes,
  format,
  getTime,
  minutesToMilliseconds,
  secondsToMilliseconds,
} from "date-fns";
import { and, eq, lt } from "drizzle-orm";
import { pipe } from "fp-ts/lib/function";
import {
  debugFilter as debugFilterBase,
  oda,
  responseTimeMiddleware as responseTimeMiddlewareConfig,
  withNextMiddleware,
} from "grammy-utils";
import { isAnyGroupChat } from "grammy-utils/filter-is-group";
import { isReply } from "grammy-utils/filter-message";
import { bot } from "~/bot";
import { db } from "~/db";
import {
  deleteMessage,
  escapeForMarkdown,
  mentionUserById,
  replyToSender,
  replyWithMessage,
  sendAsMarkdown,
} from "~/telegram/messages";
import { MILLISECONDS } from "~/time";
import { Unity2 } from "~/unity2";
import { parseTimeString } from "~/utils";
import { TableReminders } from "./schema";

const debug = oda.module.extend("remind");

export const RemindMeModule = Unity2.createModule("Remind");

const responseTimeMiddleware = responseTimeMiddlewareConfig(debug);
const debugFilter = debugFilterBase(debug);
const debugDrop = debugFilterBase(debug.extend("drop"));

setInterval(async () => {
  const d = debug.extend("timer");
  d("checking reminders");
  const reminders = await db.query.reminders.findMany({
    where: and(
      eq(TableReminders.is_reminded, false),
      lt(TableReminders.remind_at, Date.now().toString())
    ),
  });
  if (reminders.length < 1) {
    d("no reminders");
    return;
  }
  d("sending reminders");
  reminders.forEach(async (reminder) => {
    await bot.api.sendMessage(
      reminder.chat_id,
      `${mentionUserById(reminder.from)}${escapeForMarkdown(
        " - você me pediu pra te lembrar dessa mensagem"
      )}`,
      {
        ...sendAsMarkdown(),
        reply_to_message_id: reminder.message_obj.message_id,
      }
    );
    await db
      .update(TableReminders)
      .set({
        is_reminded: true,
      })
      .where(eq(TableReminders.id, reminder.id));
  });
}, minutesToMilliseconds(1));

RemindMeModule.middleware
  .filter(debugFilter("group", isAnyGroupChat))
  .filter(debugFilter("reply", isReply))
  .command("lembrar", responseTimeMiddleware("command:lembrar"))
  .command("lembrar", async (ctx, next) => {
    if (!ctx.match) {
      debug("missing time string");
      const serviceMessage = await replyWithMessage(
        `/lembrar <quando> - exemplo: /lembrar 2d (me lembre daqui dois dias)`,
        replyToSender(ctx.message!)
      )(ctx);
      deleteMessage(serviceMessage, secondsToMilliseconds(15));
      await next();
      return;
    }

    try {
      const parsedDate = parseTimeString(ctx.match);
      const now = Date.now();
      // check if reminder is at least 30min in the future
      if (differenceInMinutes(parsedDate, now) < 30) {
        debug("short reminder duration");
        await replyWithMessage(
          `Lembrete mínimo: 30 minutos. Tente novamente`,
          replyToSender(ctx.message!)
        )(ctx);
        await next();
        return;
      }

      debug("create reminder");
      await db.insert(TableReminders).values({
        chat_id: ctx.chat.id.toString(),
        remind_at: getTime(parsedDate).toString(),
        from: ctx.from,
        message_obj: ctx.message!.reply_to_message,
        from_id: ctx.from!.id.toString(),
      });
      await replyWithMessage(
        `Você será lembrado em ${format(parsedDate, "dd/MM/yyyy HH:mm:ss")}`,
        replyToSender(ctx.message!)
      )(ctx);
    } catch (e: any) {
      if (e.message === "Unable to parse time string") {
        debug("unable to parse time string");
        const serviceMessage = await replyWithMessage(
          `Não consegui definir um lembrete para ${ctx.match}`,
          replyToSender(ctx.message!)
        )(ctx);
        deleteMessage(serviceMessage, secondsToMilliseconds(15));
      } else {
        debug("uncaught parsing error");
        console.log(e);
        const serviceMessage = await replyWithMessage(
          `Erro tentando criar lembrete`,
          replyToSender(ctx.message!)
        )(ctx);
        deleteMessage(serviceMessage, secondsToMilliseconds(15));
      }
      await next();
    }
  });

// require that the command be a reply
RemindMeModule.middleware
  .filter(debugFilter("group", isAnyGroupChat))
  .drop(debugDrop("reply", isReply))
  .command(
    "lembrar",
    withNextMiddleware(async (ctx) => {
      debug("not a reply");
      const serviceMessage = await replyWithMessage(
        "Esse comando precisa ser uma resposta pra alguma mensagem. Tente novamente",
        replyToSender(ctx.message as Unity2.Message)
      )(ctx);
      setTimeout(async () => {
        await serviceMessage.delete();
      }, MILLISECONDS.SECOND * 15);
    })
  );

// disaple in groups
RemindMeModule.middleware
  .drop(debugDrop("group", isAnyGroupChat))
  .use(responseTimeMiddleware("command"))
  .command(
    "lembrar",
    withNextMiddleware((ctx) =>
      pipe(
        ctx,
        replyWithMessage("Esse comando só funciona em grupos", {
          ...replyToSender(ctx.message as Unity2.Message),
        })
      )
    )
  );
