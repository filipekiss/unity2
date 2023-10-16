import chalk from "chalk";
import { flow } from "fp-ts/lib/function";
import { oda } from "grammy-utils";
import { run as startBot } from "~/bot";
import * as CONSTANTS from "~/constants";
import { migrateBot } from "./scripts/migrate";
import { useEnvOrDefault } from "./utils";

(async () => {
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
  oda.addDebugSecrets(
    process.env.BOT_TOKEN,
    process.env.TURSO_TOKEN,
    process.env.OPENAPI_KEY
  );

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

  try {
    /* Run migrations */

    /* If in production… */
    if (process.env.NODE_ENV === "production") {
      /* …and migrations are not allowed… */
      if (process.env["UNITY2_ALLOW_MIGRATIONS"] !== "ALLOW") {
        /* …then throw an error */
        throw new Error(
          "Migrations are not allowed in the current production environment."
        );
      }
      /* Otherwise, run migrations */
      await migrateBot();
    } else {
      /* If in development, run migrations only if enabled. Prefer `bun sqlite:push` */
      if (process.env.UNITY2_ENABLE_DEV_MIGRATIONS === "yes") {
        await migrateBot();
      }
    }
  } catch (e) {
    oda.system.extend("migrations")(
      chalk.red("\u2717 Error running migrations. Unity2 will shutdown")
    );
    console.error(e);
    process.exit(127);
  }

  await startBot((ctx) => {
    oda.system.extend("error")("uncaught exception");
    console.log({ ctx });
  });
})();
