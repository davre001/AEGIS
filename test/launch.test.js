import { test } from "node:test";
import assert from "node:assert/strict";
import { launchBot } from "../src/bot/launch.js";
import { logger } from "../src/utils/logger.js";

function withLoggerErrorSpy(fn) {
  return async () => {
    const calls = [];
    const original = logger.error;
    logger.error = (...args) => calls.push(args);
    try {
      await fn(calls);
    } finally {
      logger.error = original;
    }
  };
}

test(
  "launchBot resolves once the initial handshake succeeds, without waiting for polling to stop",
  withLoggerErrorSpy(async (calls) => {
    const bot = {
      launch(onLaunch) {
        onLaunch();
        return new Promise(() => {}); // still "running" — must never settle for this test to be meaningful
      },
    };
    await launchBot(bot);
    assert.equal(calls.length, 0);
  }),
);

test(
  "a runtime polling failure after a successful launch is logged, not thrown",
  withLoggerErrorSpy(async (calls) => {
    const err = Object.assign(new Error("Conflict"), { code: 409 });
    const bot = {
      launch(onLaunch) {
        onLaunch();
        return Promise.reject(err);
      },
    };
    await assert.doesNotReject(() => launchBot(bot));
    // Flush the macrotask queue so bot.launch()'s own rejection (handled
    // separately from the resolved outer promise) has run its .catch.
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0].err, err);
  }),
);

test(
  "a handshake failure before onLaunch fires rejects launchBot instead of being swallowed",
  withLoggerErrorSpy(async (calls) => {
    const err = Object.assign(new Error("401: Unauthorized"), { code: 401 });
    const bot = {
      launch() {
        return Promise.reject(err);
      },
    };
    await assert.rejects(() => launchBot(bot), err);
    assert.equal(calls.length, 0);
  }),
);
