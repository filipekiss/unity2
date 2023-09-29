import chalk from "chalk";
import { flow, pipe } from "fp-ts/lib/function";
import { Bot } from "grammy";
import { DebugMiddleware, oda } from "grammy-utils";
import * as CONSTANTS from "~/constants";
import { useEnvOrDefault } from "./utils";
import { SummaryModule } from "~/modules/summary";
import { getDbInstance } from "./db";
import { migrateBot } from "./scripts/migrate";

async function run() {
  const bot_banner = `                                                            
                        ███   █████                ████████ 
                       ░░░   ░░███                ███░░░░███
 █████ ████ ████████   ████  ███████   █████ ████░░░    ░███
░░███ ░███ ░░███░░███ ░░███ ░░░███░   ░░███ ░███    ███████ 
 ░███ ░███  ░███ ░███  ░███   ░███     ░███ ░███   ███░░░░  
 ░███ ░███  ░███ ░███  ░███   ░███ ███ ░███ ░███  ███      █
 ░░████████ ████ █████ █████  ░░█████  ░░███████ ░██████████
  ░░░░░░░░ ░░░░ ░░░░░ ░░░░░    ░░░░░    ░░░░░███ ░░░░░░░░░░ 
                                        ███ ░███            
                                       ░░██████             
                                        ░░░░░░              
                                                            `;

  if (process.env.DISABLE_UNITY2_BANNER !== "yes") {
    const lines = bot_banner.split("\n");
    lines.forEach(flow((line) => chalk.bgMagenta.white(line), oda.debug));
  }

  /* This function allows us to redact secrets from the logs */
  oda.addDebugSecret(process.env.BOT_TOKEN);

  oda.system(oda.banner("CONSTANTS", { red: true }));

  oda
    .fromObjectToLabeledMessage(
      {
        ...CONSTANTS,
      },
      {
        label: { red: true },
        message: { red: true, dim: true },
      }
    )
    .forEach((a) => {
      oda.system(a);
    });

  oda.system(
    oda.banner("ENVIRONMENT", {
      cyan: true,
    })
  );

  oda
    .fromObjectToLabeledMessage(
      {
        NODE_ENV: useEnvOrDefault("NODE_ENV", "development"),
      },
      {
        label: { cyan: true },
        message: { cyan: true, dim: true },
      }
    )
    .forEach((a) => oda.system(a));

  // Check if the sqlite DB is actually a DB
  oda.system(oda.banner("SQLITE", { green: true }));
  try {
    const sqlite = getDbInstance();
    oda.system(
      `SQLite DB found at ${chalk.green(sqlite.protocol)} - ${chalk.green(
        CONSTANTS.DATABASE_URL
      )}`
    );
  } catch (e) {
    oda.system(
      `Path ${chalk.red(CONSTANTS.DATABASE_URL)} is not a valid SQLite DB`
    );
    oda.system(`${chalk.red("Aborting…")}`);
    process.exit(127);
  }

  /* Run migrations */
  await migrateBot();

  /* Setup Bot Instance */
  const bot = new Bot(process.env.BOT_TOKEN);

  /* Setup shutdown signal handling */

  // Generic function to shutdown bot
  const shutdown = (signal: string) => (bot: Bot) => () => {
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

  /* Disable debug mode in production */
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.UNITY2_DEBUG === "yes"
  ) {
    oda.bot("debug middleware enabled");
    bot.use(DebugMiddleware);
  }

  /* Add modules */
  bot.use(SummaryModule);

  /* Start polling for messages */
  bot.start({
    onStart: async (me) => {
      oda.bot(`login: ${chalk.blue(`${me.username}(${me.id})`)}`);
    },
  });
}

run();
