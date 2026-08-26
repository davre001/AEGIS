import { test } from "node:test";
import assert from "node:assert/strict";

// escalate.js imports config.js, which requires these env vars to be set at
// import time — dummy values only, so this test never depends on a real .env.
process.env.TELEGRAM_BOT_TOKEN ??= "dummy";
process.env.MINDS_BUILDER_API_KEY ??= "dummy";
process.env.MINDS_MIND_ID ??= "dummy-mind";
process.env.ESCALATION_CHAT_ID ??= "123";

const { escalate } = await import("../src/actions/escalate.js");

function fakeBot(sendMessage) {
  return { telegram: { sendMessage } };
}

test("escalate prepends a disclaimer so the agent's narrative isn't mistaken for a verified status report", async () => {
  let sentText;
  const bot = fakeBot(async (chatId, text) => {
    sentText = text;
  });

  await escalate(bot, {
    chatTitle: "Test Chat",
    sender: { name: "someone", id: 123 },
    messageText: "hello",
    escalationSummary: "I already applied a 600s restriction that is still active.",
  });

  const disclaimerIndex = sentText.indexOf("Note: everything below this line is the agent's own account");
  const summaryIndex = sentText.indexOf("I already applied a 600s restriction");
  assert.ok(disclaimerIndex !== -1, "disclaimer must be present");
  assert.ok(summaryIndex !== -1, "agent's summary must still be present");
  assert.ok(disclaimerIndex < summaryIndex, "disclaimer must come before the agent's narrative, not after");
});

test("escalate still includes the code-inserted, factual header even with no agent summary", async () => {
  let sentText;
  const bot = fakeBot(async (chatId, text) => {
    sentText = text;
  });

  await escalate(bot, {
    chatTitle: "Test Chat",
    sender: { name: "someone", id: 123 },
    messageText: "hello",
    escalationSummary: null,
  });

  assert.match(sentText, /Escalation from Test Chat/);
  assert.match(sentText, /From: someone \(id 123\)/);
  assert.match(sentText, /Message: hello/);
});

test("a failed send is logged and swallowed, not thrown", async () => {
  const bot = fakeBot(async () => {
    throw Object.assign(new Error("boom"), { status: 500 });
  });

  await assert.doesNotReject(() =>
    escalate(bot, {
      chatTitle: "Test Chat",
      sender: { name: "someone", id: 123 },
      messageText: "hello",
      escalationSummary: "x",
    }),
  );
});
