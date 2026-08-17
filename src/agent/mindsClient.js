import { createMindsClient } from "@animocabrands/minds-client-lib";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { withRetry } from "../utils/helpers.js";

// getLatestHistoryFingerprint/waitForReply are read-only: a 5xx there just
// means "ask again," so it's safe to retry on both rate limits and server
// errors.
export function isRetryableRead(err) {
  const status = err?.status;
  return status === 429 || (typeof status === "number" && status >= 500);
}

// sendMessage is a non-idempotent write with no client-supplied idempotency
// key in this SDK. Only 429 proves the message was rejected before Minds
// processed it. A 5xx or network error is UNKNOWN, not FAILED — Minds may
// have received and stored the message and only lost the response, so
// retrying could post the same message twice into the community's
// persistent memory. We only retry the case we can prove is safe.
export function isRetryableSend(err) {
  return err?.status === 429;
}

/**
 * Builds an askAgent function bound to a given Minds SDK client + Mind id.
 * Split out from module-scope instantiation so tests can inject a fake SDK
 * client instead of needing a real Minds API key.
 */
export function createAgentClient(sdkClient, mindId) {
  // One Telegram chat = one Minds conversation alias, so each community
  // keeps its own memory thread. ensureConversation only needs to run once
  // per alias per process lifetime, so we cache which aliases are bound.
  const ensuredAliases = new Set();

  // sendMessage/waitForReply operate on a single conversation thread per
  // alias; firing two messages into the same alias concurrently would race.
  // Queue calls per alias so a busy chat can't interleave requests.
  const aliasQueues = new Map();

  function runQueued(alias, task) {
    const previous = aliasQueues.get(alias) || Promise.resolve();
    const next = previous.then(task, task);
    aliasQueues.set(
      alias,
      next.catch(() => {}),
    );
    return next;
  }

  function aliasForChat(chatId) {
    return `telegram-${chatId}`;
  }

  async function ensureAlias(alias) {
    if (ensuredAliases.has(alias)) return;
    // ensureConversation is idempotent by design (treats "alias already
    // bound" as success internally), so retrying it on 5xx is safe.
    await withRetry(() => sdkClient.ensureConversation(alias, mindId), { isRetryable: isRetryableRead });
    ensuredAliases.add(alias);
  }

  /**
   * Sends a message to the Mind bound to this chat and waits for its reply.
   * Returns the reply text, or null if anything in the pipeline failed or
   * timed out — callers should treat null as "no decision" rather than
   * crash. Every failure path is logged with status/code before collapsing
   * to null, so nothing here fails silently.
   */
  async function askAgent(chatId, messageText, { timeoutMs = 30_000 } = {}) {
    const alias = aliasForChat(chatId);

    return runQueued(alias, async () => {
      try {
        await ensureAlias(alias);

        const before = await withRetry(() => sdkClient.getLatestHistoryFingerprint(alias), {
          isRetryable: isRetryableRead,
        });

        try {
          await withRetry(() => sdkClient.sendMessage({ alias, messageText }), { isRetryable: isRetryableSend });
        } catch (err) {
          // Ambiguous failure (5xx/network) after send: we don't know if
          // Minds has the message or not. Don't retry blind — surface it as
          // "no decision" for this message rather than risk a duplicate post.
          logger.error(
            { alias, status: err?.status, code: err?.code, err: err.message },
            "sendMessage failed; not retrying blind",
          );
          return null;
        }

        const outcome = await withRetry(
          () => sdkClient.waitForReply({ alias, timeoutMs, afterFingerprint: before }),
          { isRetryable: isRetryableRead, retries: 1 },
        );

        if (outcome.timedOut) {
          logger.warn({ alias, timeoutMs }, "minds agent reply timed out");
          return null;
        }

        return outcome.reply.messageText;
      } catch (err) {
        // Covers ensureAlias / getLatestHistoryFingerprint / a waitForReply
        // that exhausted its retries — the message was already sent by this
        // point in some of these cases, so this is "unknown," not "nothing
        // happened." We still can't act on it, so collapse to null rather
        // than let it crash the caller.
        logger.error({ alias, status: err?.status, code: err?.code, err: err.message }, "minds agent call failed");
        return null;
      }
    });
  }

  return { askAgent, aliasForChat };
}

const defaultAgentClient = createAgentClient(createMindsClient(), config.mindsMindId);
export const askAgent = defaultAgentClient.askAgent;
