import chalk from "chalk";
import debug from "debug";
import { Context, MiddlewareFn, NextFunction } from "grammy";
import { Chat } from "grammy/types";
import { oda } from ".";

export const withNextMiddleware = <T extends Context>(
  fn: (ctx: T) => unknown | Promise<unknown>
): MiddlewareFn<T> => {
  return async (ctx: T, next: NextFunction) => {
    await fn(ctx);
    await next();
  };
};

export const responseTimeMiddleware =
  (debug: debug.Debugger = oda.debug) =>
  (scope: string) => {
    return async <T extends Context>(ctx: T, next: NextFunction) => {
      const enhancedDebug = debug
        .extend(String(ctx.chat?.type))
        .extend(String(ctx.chat?.id))
        .extend(scope);
      const before = Date.now(); // milliseconds
      enhancedDebug(chalk.blue("start"));
      await next();
      const after = Date.now(); // milliseconds
      enhancedDebug(chalk.green(`end ${after - before} ms`));
    };
  };

export const withContext = <T extends Context>(
  fn: (ctx: T, next: NextFunction) => Promise<unknown>
) => {
  return (ctx: T, nested_next: NextFunction) => fn(ctx, nested_next);
};
