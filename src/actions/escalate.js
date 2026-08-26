import { config } from "../config.js";
import { logger } from "../utils/logger.js";

// Live-verified 2026-08-26 (docs/LIMITATIONS.md): the agent's own narrative
// below can state, confidently and specifically, that it already took an
// action (e.g. a restriction) that it never actually asked AEGIS to
// perform — decision.js's contract validates the shape of the agent's
// reply, not the truth of its prose. This line exists so a human reading
// the escalation never has to guess which part is real.
const AGENT_NARRATIVE_DISCLAIMER =
  "Note: everything below this line is the agent's own account of the situation, not a verified status report. " +
  "Only actions AEGIS actually executed (delete/restrict/reply/welcome) are real — check its own logs, not this " +
  "summary, before assuming something like a restriction has already happened.";

export async function escalate(bot, { chatTitle, sender, messageText, escalationSummary }) {
  const summary = [
    `Escalation from ${chatTitle}`,
    `From: ${sender.name} (id ${sender.id})`,
    `Message: ${messageText}`,
    "",
    AGENT_NARRATIVE_DISCLAIMER,
    "",
    escalationSummary || "No additional summary provided by the agent.",
  ].join("\n");

  try {
    await bot.telegram.sendMessage(config.escalationChatId, summary);
    logger.info({ chatTitle, senderId: sender.id }, "escalated to human moderator");
  } catch (err) {
    logger.error({ chatTitle, senderId: sender.id, err }, "failed to escalate");
  }
}
