import { logger } from "../utils/logger.js";
import { deleteMessage } from "./deleteMessage.js";
import { sendReply } from "./sendReply.js";
import { restrictUser } from "./restrictUser.js";
import { escalate } from "./escalate.js";
import { welcome } from "./welcome.js";

/**
 * Runs the action a decision calls for. Every handler already isolates its
 * own Telegram-API failures, so a dispatch never throws — one bad decision
 * or one Telegram hiccup can't take the bot down.
 */
export async function dispatchDecision(bot, decision, ctx) {
  const { chatId, messageId, userId, chatTitle, sender, messageText, member } = ctx;

  switch (decision.action) {
    case "delete":
      return deleteMessage(bot, { chatId, messageId, reason: decision.reason });
    case "reply":
      return sendReply(bot, { chatId, messageId, text: decision.replyContent });
    case "restrict":
      return restrictUser(bot, {
        chatId,
        userId,
        restrictSeconds: decision.restrictSeconds,
        reason: decision.reason,
      });
    case "escalate":
      return escalate(bot, { chatTitle, sender, messageText, escalationSummary: decision.escalationSummary });
    case "welcome":
      return welcome(bot, { chatId, text: decision.replyContent, member: member || sender });
    case "none":
      logger.debug({ chatId, reason: decision.reason }, "no action taken");
      return;
    default:
      logger.warn({ action: decision.action }, "unknown decision action; ignoring");
  }
}
