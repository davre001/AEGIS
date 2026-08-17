import pino from "pino";

// Reads process.env directly rather than importing ../config.js: logging
// has nothing to do with the app's required secrets (TELEGRAM_BOT_TOKEN,
// MINDS_BUILDER_API_KEY, etc.), but config.js validates all of those at
// import time. Pulling in the full config here would mean any pure-logic
// module that just wants to log (e.g. decision.js) couldn't be imported —
// or tested — without those secrets being set.
const logLevel = process.env.LOG_LEVEL || "info";
const nodeEnv = process.env.NODE_ENV || "development";

export const logger = pino({
  level: logLevel,
  // Every call site logs the raw Error under the `err` key (not err.message)
  // so this serializer can expand it into { type, message, stack } — losing
  // the stack trace on an unexpected throw is the difference between a
  // five-minute fix and an hour of guessing where it came from.
  serializers: { err: pino.stdSerializers.err },
  transport:
    nodeEnv === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
      : undefined,
});
