import { Composer } from "grammy";
import { oda, withNext } from "grammy-utils";

const debug = oda.middleware.extend("debug");

export const DebugMiddleware = new Composer();

DebugMiddleware.on(
  "message:text",
  withNext((ctx) => {
    debug(`text message received: ${ctx.message.text} - ${ctx.chat.id}`);
  })
);

DebugMiddleware.command("debug", async (ctx) => {
  await ctx.reply(`Chat ID: ${ctx.chat.id}`);
});
