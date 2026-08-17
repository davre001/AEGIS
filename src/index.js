import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { createBot } from "./bot/bot.js";

process.on("unhandledRejection", (err) => {
  logger.fatal({ err: err?.message || err }, "unhandled rejection");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err: err.message }, "uncaught exception");
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
  logger.fatal({ err: err.message }, "failed to start AEGIS");
  process.exit(1);
});
