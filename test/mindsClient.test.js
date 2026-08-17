import { test } from "node:test";
import assert from "node:assert/strict";

// createAgentClient reads config at import time via mindsClient.js's default
// export, so required env vars must be set (to harmless dummy values, no
// live credentials) before that module is evaluated.
process.env.TELEGRAM_BOT_TOKEN ??= "dummy";
process.env.MINDS_BUILDER_API_KEY ??= "dummy";
process.env.MINDS_MIND_ID ??= "dummy-mind";
process.env.ESCALATION_CHAT_ID ??= "123";

const { createAgentClient } = await import("../src/agent/mindsClient.js");

function makeFakeSdk({ sendMessage, waitForReply } = {}) {
  const calls = { ensureConversation: 0, getLatestHistoryFingerprint: 0, sendMessage: 0, waitForReply: 0 };
  return {
    calls,
    async ensureConversation() {
      calls.ensureConversation += 1;
    },
    async getLatestHistoryFingerprint() {
      calls.getLatestHistoryFingerprint += 1;
      return "fp-0";
    },
    async sendMessage(...args) {
      calls.sendMessage += 1;
      return sendMessage ? sendMessage(...args) : {};
    },
    async waitForReply(...args) {
      calls.waitForReply += 1;
      return waitForReply ? waitForReply(...args) : { timedOut: false, reply: { messageText: "ok" } };
    },
  };
}

test("does not retry sendMessage on an ambiguous 5xx, and returns null instead of throwing", async () => {
  const sdk = makeFakeSdk({
    sendMessage: () => {
      throw Object.assign(new Error("boom"), { status: 500 });
    },
  });
  const { askAgent } = createAgentClient(sdk, "mind-1");

  const result = await askAgent("chat-1", "hello");

  assert.equal(result, null);
  assert.equal(sdk.calls.sendMessage, 1, "a 5xx on a non-idempotent write must not be retried blind");
});

test("retries sendMessage on 429 (provably rejected before processing) and eventually succeeds", async () => {
  let attempts = 0;
  const sdk = makeFakeSdk({
    sendMessage: () => {
      attempts += 1;
      if (attempts < 3) throw Object.assign(new Error("rate limited"), { status: 429 });
      return {};
    },
  });
  const { askAgent } = createAgentClient(sdk, "mind-1");

  const result = await askAgent("chat-1", "hello");

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});

test("returns null instead of throwing when waitForReply fails after sendMessage already succeeded", async () => {
  const sdk = makeFakeSdk({
    waitForReply: () => {
      throw Object.assign(new Error("gone"), { status: 500 });
    },
  });
  const { askAgent } = createAgentClient(sdk, "mind-1");

  const result = await askAgent("chat-1", "hello");

  assert.equal(result, null);
  assert.equal(sdk.calls.sendMessage, 1, "the message was already sent; this must not crash the caller");
});

test("returns null when the agent reply times out", async () => {
  const sdk = makeFakeSdk({ waitForReply: () => ({ timedOut: true }) });
  const { askAgent } = createAgentClient(sdk, "mind-1");

  assert.equal(await askAgent("chat-1", "hello"), null);
});

test("serializes concurrent askAgent calls for the same chat instead of racing the same conversation", async () => {
  const order = [];
  const sdk = makeFakeSdk({
    sendMessage: async () => {
      order.push("send-start");
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push("send-end");
      return {};
    },
  });
  const { askAgent } = createAgentClient(sdk, "mind-1");

  await Promise.all([askAgent("chat-1", "first"), askAgent("chat-1", "second")]);

  assert.deepEqual(order, ["send-start", "send-end", "send-start", "send-end"]);
});

test("ensureConversation only runs once per alias across multiple calls", async () => {
  const sdk = makeFakeSdk();
  const { askAgent } = createAgentClient(sdk, "mind-1");

  await askAgent("chat-1", "first");
  await askAgent("chat-1", "second");

  assert.equal(sdk.calls.ensureConversation, 1);
});
