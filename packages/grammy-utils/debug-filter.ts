import debug from "debug";
import { oda } from ".";
import { Context } from "grammy";

export const debugFilter =
  (debug: debug.Debugger = oda.debug) =>
  (
    message: string,
    predicate: <T extends Context>(ctx: T) => boolean | Promise<boolean>
  ) => {
    return async <T extends Context>(ctx: T) => {
      const result = await predicate(ctx);
      debug
        .extend(`predicate:${Boolean(result) ? "match" : "skip"}`)
        .extend(String(ctx.chat?.type))
        .extend(String(ctx.chat?.id))(message);
      return result;
    };
  };
