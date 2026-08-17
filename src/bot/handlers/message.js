import { logger } from "../../utils/logger.js";
import { askAgent } from "../../agent/mindsClient.js";
import { buildAgentMessage, buildWelcomeMessage } from "../../agent/prompt.js";
import { parseDecision } from "../../agent/decision.js";
import { dispatchDecision } from "../../actions/index.js";

function senderFromCtx(ctx) {
  const from = ctx.from;
  return { id: from.id, name: from.username || from.first_name || `user-${from.id}` };
}

/**
 * Handles one incoming text message end to end. Wrapped so that any failure
 * (agent timeout, malformed reply, Telegram error) is logged and swallowed
 * here rather than crashing the whole bot process over a single message.
 */
export async function handleMessage(bot, ctx) {
  if (!ctx.message?.text || ctx.from?.is_bot) return;

  const startedAt = Date.now();
  const chatId = ctx.chat.id;
  const messageId = ctx.message.message_id;
  const sender = senderFromCtx(ctx);
  const chatTitle = ctx.chat.title || String(chatId);
  const messageText = ctx.message.text;

  try {
    const agentMessage = buildAgentMessage({ chatTitle, sender, isNewMember: false, messageText });
    const rawReply = await askAgent(chatId, agentMessage);
    const decision = parseDecision(rawReply);

    logger.info(
      { chatId, senderId: sender.id, action: decision.action, latencyMs: Date.now() - startedAt },
      "moderation decision",
    );

    await dispatchDecision(bot, decision, { chatId, messageId, userId: sender.id, chatTitle, sender, messageText });
  } catch (err) {
    logger.error({ chatId, senderId: sender.id, err: err.message }, "failed to handle message");
  }
}

export async function handleNewMember(bot, ctx) {
  const chatId = ctx.chat.id;
  const chatTitle = ctx.chat.title || String(chatId);

  for (const newMember of ctx.message.new_chat_members || []) {
    if (newMember.is_bot) continue;
    const member = { id: newMember.id, name: newMember.username || newMember.first_name };

    try {
      const agentMessage = buildWelcomeMessage({ chatTitle, member });
      const rawReply = await askAgent(chatId, agentMessage);
      const decision = parseDecision(rawReply);
      await dispatchDecision(bot, decision, { chatId, member, sender: member, chatTitle });
    } catch (err) {
      logger.error({ chatId, memberId: member.id, err: err.message }, "failed to handle new member");
    }
  }
}
