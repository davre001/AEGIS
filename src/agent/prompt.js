const RESPONSE_CONTRACT = `Respond with ONLY a single JSON object (no prose, no code fence) matching:
{
  "action": "delete" | "reply" | "restrict" | "escalate" | "welcome" | "none",
  "reason": string,
  "replyContent": string | null,
  "restrictSeconds": number | null,
  "escalationSummary": string | null
}`;

const SYSTEM_FRAMING = `You are AEGIS, the persistent moderation memory for this Telegram community.
You remember members, past conflicts, resolved questions, and this community's norms across sessions.
For every incoming message, decide the single best moderation action using that memory and the context below.
Prefer "none" when no action is warranted. Only "escalate" for complex or sensitive cases a human should judge.
${RESPONSE_CONTRACT}`;

export function buildAgentMessage({ chatTitle, sender, isNewMember, messageText }) {
  const context = [
    `Community: ${chatTitle}`,
    `Sender: ${sender.name} (id ${sender.id}${isNewMember ? ", just joined" : ""})`,
    `Message: ${messageText}`,
  ].join("\n");

  return `${SYSTEM_FRAMING}\n\n${context}`;
}

export function buildWelcomeMessage({ chatTitle, member }) {
  return `${SYSTEM_FRAMING}\n\nCommunity: ${chatTitle}\nEvent: ${member.name} (id ${member.id}) just joined the group. Decide how to welcome them.`;
}
