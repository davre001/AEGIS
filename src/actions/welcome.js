import { logger } from "../utils/logger.js";

export async function welcome(bot, { chatId, text, member }) {
  const message = text || `Welcome, ${member.name}! Glad to have you here.`;
  try {
    await bot.telegram.sendMessage(chatId, message);
    logger.info({ chatId, memberId: member.id }, "welcomed new member");
  } catch (err) {
    logger.error({ chatId, memberId: member.id, err: err.message }, "failed to welcome member");
  }
}
