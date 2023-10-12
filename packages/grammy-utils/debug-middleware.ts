import { Composer } from "grammy";
import { oda, withNextMiddleware } from "grammy-utils";

const debug = oda.middleware.extend("debug");

export const DebugMiddleware = new Composer();

DebugMiddleware.on(
  "message:text",
  withNextMiddleware((ctx) => {
    debug(`text message received: ${ctx.message.text} - ${ctx.chat.id}`);
  })
);

DebugMiddleware.command("debug", async (ctx) => {
  await ctx.reply(`Chat ID: ${ctx.chat.id}`);
});
