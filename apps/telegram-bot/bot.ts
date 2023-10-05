import { FileApiFlavor, FileFlavor } from "@grammyjs/files";
import {
  HydrateApiFlavor,
  HydrateFlavor,
  hydrateApi,
  hydrateContext,
} from "@grammyjs/hydrate";
import chalk from "chalk";
import { flow, pipe } from "fp-ts/lib/function";
import { Api, Bot, Context } from "grammy";
import { DebugMiddleware, oda } from "grammy-utils";
import { SummaryModule } from "~/modules/summary";

export type Unity2Context = HydrateFlavor<FileFlavor<Context>>;
export type Unity2Api = HydrateApiFlavor<FileApiFlavor<Api>>;
export type Unity2Bot = Bot<Unity2Context, Unity2Api>;
export type Unity2Message = NonNullable<Unity2Context["msg"]>;
export type Unity2User = NonNullable<Unity2Context["from"]>;
export type Unity2Chat = NonNullable<Unity2Context["chat"]>;

const bot = new Bot<Unity2Context, Unity2Api>(process.env.BOT_TOKEN);

bot.use(hydrateContext());
bot.api.config.use(hydrateApi());

/* Setup shutdown signal handling */

// Generic function to shutdown bot
const shutdown = (signal: string) => (bot: Unity2Bot) => () => {
  oda.bot(`${chalk.yellow(signal)} received…`);
  oda.bot("gracefully shutting down…");
  bot.stop();
  oda.bot(chalk.green.underline("bye!"));
};

// Map a signal to a function that shuts down the bot
const captureShutdownSignal = (signal: string) =>
  process.once(
    signal,
    flow(oda.clearTerminalLine, pipe(bot, shutdown(signal)))
  );

["SIGINT", "SIGTERM"].forEach(captureShutdownSignal);

/* Disable debug mode in production - unless forced */
const enableDebugMiddleware =
  process.env.NODE_ENV !== "production" || process.env.UNITY2_DEBUG === "yes";
if (enableDebugMiddleware) {
  oda.bot(
    `debug middleware is ${oda.onOff({
      on: "enabled",
      off: "disabled",
    })(enableDebugMiddleware)}`
  );
  bot.use(DebugMiddleware);
} else {
  oda.bot(
    `debug middleware is ${oda.onOff({
      on: "enabled",
      off: "disabled",
    })(enableDebugMiddleware)}`
  );
}

/* Add modules */
bot.use(SummaryModule);

export async function run() {
  /* Setup Bot Instance */

  oda.bot(`Using bot token ${chalk.blue(process.env.BOT_TOKEN)}`);

  /* Start polling for messages */
  bot.start({
    onStart: async (me) => {
      oda.bot(`login: ${chalk.blue(`${me.username}(${me.id})`)}`);
    },
  });
}
