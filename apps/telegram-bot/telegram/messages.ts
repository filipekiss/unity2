import { Context } from "grammy";
import { Message } from "grammy/types";
import { SetRequired } from "type-fest";
import { Unity2 } from "~/unity2";

type Unity2ContextReplyArguments = Parameters<Unity2.Context["reply"]>;

/* Generic message utilities */

export const lines = (...lines: string[]) => lines.join("\n");

export function escapeForMarkdown(
  text: string,
  options: { escapeItalic: boolean } = { escapeItalic: false }
): string {
  const noItalicRegex = /[[\]()~>#+=|{}.!\\-]/g;
  const italicRegex = /[[\]_()~>#+=|{}.!\\-]/g;
  if (options.escapeItalic) {
    return text.replace(italicRegex, "\\$&");
  }
  return text.replace(noItalicRegex, "\\$&");
}

export const getMessageAuthor = (message: Unity2.Message) => {
  return message.forward_from?.id
    ? message.forward_from
    : (message.from as Unity2.User);
};

export const getMessageDate = (message: Unity2.Message) => {
  return message.forward_date ? message.forward_date : message.date;
};

/* Context Message Utilities */

export const replyWithMessage =
  (
    message: string,
    options: SetRequired<
      NonNullable<Unity2ContextReplyArguments[1]>,
      "reply_to_message_id"
    >
  ) =>
  async (ctx: Unity2.Context): Promise<Unity2.Message> =>
    await sendMessage(message, options)(ctx);

export const sendMessage =
  (message: string, options?: Unity2ContextReplyArguments[1]) =>
  async (ctx: Unity2.Context): Promise<Unity2.Message> =>
    (await ctx.reply(message, options)) as Unity2.Message;

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

export const mentionUserById = (user: Unity2.User) => {
  return `[${user.first_name}](tg://user?id=${user.id})`;
};

/* Message option utilities */

export const replyToSender = <TMessage extends NonNullable<Context["message"]>>(
  message: TMessage
) => {
  return {
    reply_to_message_id: message?.message_id,
  } as const;
};

export const replyToReply = (message: Unity2.Message.With.Reply) => {
  return {
    reply_to_message_id: message.reply_to_message.message_id,
  } as const;
};

export const replyToReplyOrToSender = (message: Unity2.Message) => {
  return {
    reply_to_message_id:
      message.reply_to_message?.message_id ?? message.message_id,
  } as const;
};

export const sendAsMarkdown = (): { parse_mode: "MarkdownV2" } => {
  return {
    parse_mode: "MarkdownV2",
  } as const;
};

export const removeKeyboard = (): {
  reply_markup: { remove_keyboard: true };
} => {
  return {
    reply_markup: {
      remove_keyboard: true,
    },
  } as const;
};
