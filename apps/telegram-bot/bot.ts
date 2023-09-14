import chalk from "chalk";
import { flow, pipe } from "fp-ts/lib/function";
import { Bot, CommandContext, Context } from "grammy";
import { botLog } from "./log";

const bot = new Bot(process.env.BOT_TOKEN);

const reply = (message: string) => (ctx: CommandContext<Context>) => ctx.reply(message);

const clearLine = flow(() => process.stdout.clearLine(0),
	() => process.stdout.cursorTo(0),
)

const shutdown = (signal: string) => (bot: Bot) => () => {
	botLog.info(`${chalk.yellow(signal)} received…`);
	botLog.info("Gracefully shutting down…");
	bot.stop();
	botLog.success(chalk.green.underline("Bye!"))
}

bot.command("start", flow(reply("Type in your credit card number")));

const captureSignal = (signal: string) => process.once(signal, flow(clearLine, pipe(bot, shutdown(signal))));

["SIGINT", "SIGTERM"].forEach(captureSignal);

bot.start({
	onStart: async (me) => {
		botLog.info(chalk.blue(`${me.username} (${me.id})`))
	},
});

