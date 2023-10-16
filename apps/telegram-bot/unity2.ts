import { FileApiFlavor, FileFlavor } from "@grammyjs/files";
import { HydrateApiFlavor, HydrateFlavor } from "@grammyjs/hydrate";
import {
  Api as ApiBase,
  Bot as BotBase,
  Composer as ComposerBase,
  Context as ContextBase,
} from "grammy";
import { SetNonNullable, SetRequired } from "type-fest";

export declare namespace Unity2 {
  type Api = HydrateApiFlavor<FileApiFlavor<ApiBase>>;
  type Bot = BotBase<Context, Api>;
  /* Context */
  type Context = HydrateFlavor<FileFlavor<ContextBase>>;
  namespace Context {
    namespace With {
      type ContextWith<TPropertyOrObject> =
        TPropertyOrObject extends keyof Unity2.Context
          ? SetNonNullable<
              SetRequired<Unity2.Context, TPropertyOrObject>,
              TPropertyOrObject
            >
          : Unity2.Context & TPropertyOrObject;
      type Message = ContextWith<"message">;
      type TextMessage = ContextWith<{
        message: Message.With.Text;
      }>;
      type User = ContextWith<{ from: User }>;
      type Chat = ContextWith<{ chat: Chat }>;
    }
  }
  /* Message */
  type Message = NonNullable<Context["message"]>;
  namespace Message {
    namespace With {
      type MessageWith<TPropertyOrObject> =
        TPropertyOrObject extends keyof Unity2.Message
          ? SetRequired<Unity2.Message, TPropertyOrObject>
          : Unity2.Message & TPropertyOrObject;
      type Text = MessageWith<"text">;
      type Reply = MessageWith<"reply_to_message">;
    }
    type Reply = Message.With.Reply["reply_to_message"];
  }

  type User = NonNullable<Context["from"]>;
  type Chat = NonNullable<Context["chat"]>;
  type Middleware = ComposerBase<Context>;
  type Module = { name: string; middleware: Middleware };
}

const installedModules = new Map();

function createModule(
  name: string,
  middleware: Unity2.Middleware = new ComposerBase()
) {
  return {
    middleware,
    name,
  };
}

function addModule(module: Unity2.Module) {
  installedModules.set(module.name, module);
  return installedModules.get(module.name);
}

export const Unity2 = {
  createModule,
  addModule,
};
