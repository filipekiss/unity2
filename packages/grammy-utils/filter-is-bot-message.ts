import { Context } from "grammy";

export function isFromBot(ctx: Context) {
  return ctx.from?.is_bot;
}

export function isBotCommand(ctx: Context) {
  return ctx.message?.text?.startsWith("/");
}
