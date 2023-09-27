import { Composer } from "grammy";
import { oda, withNext } from "grammy-utils";

export const DebugMiddleware = new Composer();

DebugMiddleware.on("message:text", withNext((ctx) => {
	oda.bot(`text message received: ${ctx.message.text} - ${ctx.chat.id}`)
}));
