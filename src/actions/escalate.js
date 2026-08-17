import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export async function escalate(bot, { chatTitle, sender, messageText, escalationSummary }) {
  const summary = [
    `Escalation from ${chatTitle}`,
    `From: ${sender.name} (id ${sender.id})`,
    `Message: ${messageText}`,
    "",
    escalationSummary || "No additional summary provided by the agent.",
  ].join("\n");

  try {
    await bot.telegram.sendMessage(config.escalationChatId, summary);
    logger.info({ chatTitle, senderId: sender.id }, "escalated to human moderator");
  } catch (err) {
    logger.error({ chatTitle, senderId: sender.id, err: err.message }, "failed to escalate");
  }
}
