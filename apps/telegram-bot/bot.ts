import { hydrateApi, hydrateContext } from "@grammyjs/hydrate";
import chalk from "chalk";
import { Bot } from "grammy";
import { DebugMiddleware, oda } from "grammy-utils";
import { type Unity2 } from "./unity2";
import { SummaryModule } from "./modules/summary";

const bot = new Bot<Unity2.Context, Unity2.Api>(process.env.BOT_TOKEN);

bot.use(hydrateContext());
bot.api.config.use(hydrateApi());

/* Setup shutdown signal handling */

// Generic function to shutdown bot
const shutdown = (signal: string) => (bot: Unity2.Bot) => async () => {
  oda.bot(`${chalk.yellow(signal)} received…`);
  oda.bot("gracefully shutting down…");
  await bot.stop();
  oda.bot(chalk.green.underline("bye!"));
};

// Map a signal to a function that shuts down the bot
const captureShutdownSignal = (signal: string) =>
  process.once(signal, async () => {
    oda.clearTerminalLine();
    await shutdown(signal)(bot)();
  });

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
bot.use(SummaryModule.middleware);

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
