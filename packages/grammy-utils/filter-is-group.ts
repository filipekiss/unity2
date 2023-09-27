import { Context } from "grammy";

export const isNotGroupChat = (ctx: Context) => {
  return !isGroupChat(ctx) && !isSupergroupChat(ctx);
};

export const isGroupChat = (ctx: Context) => {
  return ctx.chat?.type === "group";
};

export const isSupergroupChat = (ctx: Context) => {
  return ctx.chat?.type === "supergroup";
};

export const isAnyGroupChat = (ctx: Context) => {
  return isGroupChat(ctx) || isSupergroupChat(ctx);
};
