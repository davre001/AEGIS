import { Telegraf } from "telegraf";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { handleMessage, handleNewMember } from "./handlers/message.js";

export function createBot() {
  const bot = new Telegraf(config.telegramBotToken);

  bot.on("new_chat_members", (ctx) => handleNewMember(bot, ctx));
  bot.on("text", (ctx) => handleMessage(bot, ctx));

  // Telegraf-level errors (bad updates, middleware throws we missed) land
  // here instead of killing the process.
  bot.catch((err, ctx) => {
    logger.error({ updateType: ctx.updateType, err: err.message }, "unhandled bot error");
  });

  return bot;
}
