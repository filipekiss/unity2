import { Context } from "grammy";
import { Unity2 } from "~/unity2";

type Unity2ContextReplyArguments = Parameters<Unity2.Context["reply"]>;

export const contextReply =
  (message: string, options?: Unity2ContextReplyArguments[1]) =>
  async (ctx: Unity2.Context): Promise<Unity2.Message> =>
    (await ctx.reply(message, options)) as Unity2.Message;

export const replyToSender = <TMessage extends NonNullable<Context["message"]>>(
  message: TMessage
) => {
  return {
    reply_to_message_id: message.message_id,
  };
};

export const replyToReply = (message: Unity2.Message.With.Reply) => {
  return {
    reply_to_message_id: message.reply_to_message.message_id,
  };
};

export const replyToReplyOrToSender = (message: Unity2.Message) => {
  return {
    reply_to_message_id:
      message.reply_to_message?.message_id ?? message.message_id,
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
  message: Unity2.Message,
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

export const getMessageAuthor = (message: Unity2.Message) => {
  return message.forward_from?.id
    ? message.forward_from
    : (message.from as Unity2.User);
};

export const getMessageDate = (message: Unity2.Message) => {
  return message.forward_date ? message.forward_date : message.date;
};
