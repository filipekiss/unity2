import { Context, NextFunction } from "grammy";

export const withNext = <T extends Context>(
	fn: (ctx: T) => any | Promise<any>
) => {
	return async (ctx: T, next: NextFunction) => {
		await fn(ctx);
		await next();
	};
};
