import { logger } from "../utils/logger.js";

export async function deleteMessage(bot, { chatId, messageId, reason }) {
  try {
    await bot.telegram.deleteMessage(chatId, messageId);
    logger.info({ chatId, messageId, reason }, "deleted message");
  } catch (err) {
    logger.error({ chatId, messageId, err: err.message }, "failed to delete message");
  }
}
