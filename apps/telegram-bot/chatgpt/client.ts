import { ChatGPTAPI } from "chatgpt";
import { OPENAPI_KEY } from "~/constants";

export const chatGptClient = new ChatGPTAPI({
  apiKey: OPENAPI_KEY,
});
