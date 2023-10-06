import { Context, MiddlewareFn, NextFunction } from "grammy";

export const withNext = <T extends Context>(
  fn: (ctx: T) => unknown | Promise<unknown>
): MiddlewareFn<T> => {
  return async (ctx: T, next: NextFunction) => {
    await fn(ctx);
    await next();
  };
};
