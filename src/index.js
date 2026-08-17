import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { createBot } from "./bot/bot.js";

process.on("unhandledRejection", (err) => {
  // A rejected promise can reject with a non-Error value; pino's err
  // serializer passes non-Error-like values through unchanged rather than
  // throwing, so this is safe either way.
  logger.fatal({ err }, "unhandled rejection");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception");
  process.exit(1);
});

async function main() {
  logger.info({ nodeEnv: config.nodeEnv }, "starting AEGIS");

  const bot = createBot();
  await bot.launch();
  logger.info("AEGIS is online and listening for messages");

  const shutdown = (signal) => {
    logger.info({ signal }, "shutting down");
    bot.stop(signal);
    process.exit(0);
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.fatal({ err }, "failed to start AEGIS");
  process.exit(1);
});
