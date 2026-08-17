import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDecision } from "../src/agent/decision.js";

test("parses a clean JSON decision", () => {
  const decision = parseDecision(
    JSON.stringify({
      action: "reply",
      reason: "repeated question",
      replyContent: "see pinned post",
      restrictSeconds: null,
      escalationSummary: null,
    }),
  );
  assert.equal(decision.action, "reply");
  assert.equal(decision.replyContent, "see pinned post");
});

test("extracts JSON wrapped in prose and a code fence", () => {
  const raw = 'Sure, here you go:\n```json\n{"action":"delete","reason":"spam"}\n```\nHope that helps!';
  const decision = parseDecision(raw);
  assert.equal(decision.action, "delete");
  assert.equal(decision.reason, "spam");
});

test("falls back to none on unparseable text instead of throwing", () => {
  const decision = parseDecision("I think we should just ban them tbh");
  assert.equal(decision.action, "none");
  assert.equal(decision.reason, "unparseable_agent_response");
});

test("falls back to none when the agent never replied", () => {
  const decision = parseDecision(null);
  assert.equal(decision.action, "none");
  assert.equal(decision.reason, "agent_no_reply");
});

test("rejects an action outside the known contract", () => {
  const decision = parseDecision(JSON.stringify({ action: "nuke_the_server", reason: "x" }));
  assert.equal(decision.action, "none");
  assert.equal(decision.reason, "unparseable_agent_response");
});

test("coerces non-string/number optional fields to null instead of passing them through", () => {
  const decision = parseDecision(JSON.stringify({ action: "restrict", reason: "spam", restrictSeconds: "600" }));
  assert.equal(decision.action, "restrict");
  assert.equal(decision.restrictSeconds, null);
});
