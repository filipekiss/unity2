import { Context } from "grammy";
import { ApiMethods } from "grammy/types";
import { Unity2Context, Unity2Message, Unity2User } from "~/bot";

type Unity2ContextReplyArguments = Parameters<Unity2Context["reply"]>;

export const contextReply =
  (message: string, options?: Unity2ContextReplyArguments[1]) =>
  async (ctx: Context) =>
    await ctx.reply(message, options);

export const replyToSender = (context: Unity2Context) => {
  return {
    reply_to_message_id: context.message?.message_id,
  };
};

export const replyToReply = (context: Unity2Context) => {
  return {
    reply_to_message_id: context.message?.reply_to_message?.message_id,
  };
};

export const replyToReplyOrToSender = (context: Unity2Context) => {
  return {
    reply_to_message_id:
      context.message?.reply_to_message?.message_id ??
      context.message!.message_id,
  };
};

export const sendAsMarkdown = (): { parse_mode: "MarkdownV2" } => {
  return {
    parse_mode: "MarkdownV2",
  };
};

export const removeKeyboard = (): {
  reply_markup: { remove_keyboard: true };
} => {
  return {
    reply_markup: {
      remove_keyboard: true,
    },
  };
};

export const deleteMessage = async (
  message: Unity2Message,
  timeout: number = 0
) => {
  const delFn = async () => {
    try {
      await message.delete();
    } catch {
      console.warn("Unable to delete message. Skipping…");
    }
  };
  if (timeout === 0) {
    await delFn();
    return;
  }
  setTimeout(async () => {
    await delFn();
  }, timeout);
};

export const getMessageAuthor = (message: Unity2Message) => {
  return message.forward_from?.id
    ? message.forward_from
    : (message.from as Unity2User);
};

export const getMessageDate = (message: Unity2Message) => {
  return message.forward_date ? message.forward_date : message.date;
};
