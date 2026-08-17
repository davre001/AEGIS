import { test } from "node:test";
import assert from "node:assert/strict";
import { withRetry, extractJsonObject } from "../src/utils/helpers.js";

test("withRetry succeeds after transient retryable failures", async () => {
  let attempts = 0;
  const result = await withRetry(
    async () => {
      attempts += 1;
      if (attempts < 3) throw Object.assign(new Error("rate limited"), { status: 429 });
      return "ok";
    },
    { isRetryable: (err) => err.status === 429, baseDelayMs: 1 },
  );
  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});

test("withRetry does not retry an error the caller marked non-retryable", async () => {
  let attempts = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          attempts += 1;
          throw Object.assign(new Error("unauthorized"), { status: 401 });
        },
        { isRetryable: (err) => err.status === 429, baseDelayMs: 1 },
      ),
    /unauthorized/,
  );
  assert.equal(attempts, 1);
});

test("withRetry gives up after exhausting retries", async () => {
  let attempts = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          attempts += 1;
          throw Object.assign(new Error("still limited"), { status: 429 });
        },
        { isRetryable: () => true, retries: 2, baseDelayMs: 1 },
      ),
    /still limited/,
  );
  assert.equal(attempts, 3);
});

test("extractJsonObject pulls the first balanced object out of surrounding text", () => {
  const parsed = extractJsonObject('prefix noise {"a": 1, "b": {"c": 2}} trailing noise');
  assert.deepEqual(parsed, { a: 1, b: { c: 2 } });
});

test("extractJsonObject returns null when there is no valid object", () => {
  assert.equal(extractJsonObject("no json here at all"), null);
  assert.equal(extractJsonObject("{ unbalanced"), null);
});
