import { Context } from "grammy";
import {
	ApiMethods
} from "grammy/types";

type MessageOptions = Parameters<ApiMethods["sendMessage"]>[0]

export const contextReply = (message: string, options?: MessageOptions) => async (ctx: Context) => await ctx.reply(message, options)
