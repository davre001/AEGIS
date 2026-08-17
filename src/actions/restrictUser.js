import { logger } from "../utils/logger.js";

const DEFAULT_RESTRICT_SECONDS = 600;

export async function restrictUser(bot, { chatId, userId, restrictSeconds, reason }) {
  const seconds = restrictSeconds ?? DEFAULT_RESTRICT_SECONDS;
  try {
    await bot.telegram.restrictChatMember(chatId, userId, {
      permissions: { can_send_messages: false },
      until_date: Math.floor(Date.now() / 1000) + seconds,
    });
    logger.info({ chatId, userId, seconds, reason }, "restricted user");
  } catch (err) {
    logger.error({ chatId, userId, err: err.message }, "failed to restrict user");
  }
}
