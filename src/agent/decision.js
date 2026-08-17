import { logger } from "../utils/logger.js";
import { extractJsonObject } from "../utils/helpers.js";

const VALID_ACTIONS = new Set(["delete", "reply", "restrict", "escalate", "welcome", "none"]);

const NO_ACTION = Object.freeze({
  action: "none",
  reason: "no_decision",
  replyContent: null,
  restrictSeconds: null,
  escalationSummary: null,
});

/**
 * Turns a raw agent reply into a validated decision object. The agent is an
 * LLM, so its output can be malformed, missing fields, or use an unknown
 * action — none of that should ever crash the bot. Anything that doesn't
 * parse cleanly falls back to "none" and gets logged for follow-up.
 */
export function parseDecision(rawReply) {
  if (!rawReply) {
    return { ...NO_ACTION, reason: "agent_no_reply" };
  }

  const parsed = extractJsonObject(rawReply);
  if (!parsed || typeof parsed.action !== "string" || !VALID_ACTIONS.has(parsed.action)) {
    logger.warn({ rawReply }, "agent reply did not match the decision contract; defaulting to none");
    return { ...NO_ACTION, reason: "unparseable_agent_response" };
  }

  return {
    action: parsed.action,
    reason: typeof parsed.reason === "string" ? parsed.reason : "",
    replyContent: typeof parsed.replyContent === "string" ? parsed.replyContent : null,
    restrictSeconds: typeof parsed.restrictSeconds === "number" ? parsed.restrictSeconds : null,
    escalationSummary: typeof parsed.escalationSummary === "string" ? parsed.escalationSummary : null,
  };
}
