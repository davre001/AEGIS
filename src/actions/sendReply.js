import { logger } from "../utils/logger.js";

export async function sendReply(bot, { chatId, messageId, text }) {
  if (!text) {
    logger.warn({ chatId, messageId }, "reply action had no replyContent; skipping");
    return;
  }
  try {
    await bot.telegram.sendMessage(chatId, text, { reply_parameters: { message_id: messageId } });
    logger.info({ chatId, messageId }, "sent reply");
  } catch (err) {
    logger.error({ chatId, messageId, err }, "failed to send reply");
  }
}
