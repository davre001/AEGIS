import { logger } from "../utils/logger.js";

// bot.launch() only resolves once polling stops, so awaiting it directly
// would block startup forever during normal operation. Its onLaunch
// callback fires once right after the initial Telegram handshake succeeds,
// before polling starts — this resolves on that instead.
export async function launchBot(bot) {
  let launchedOk = false;
  await new Promise((resolve, reject) => {
    bot
      .launch(() => {
        launchedOk = true;
        resolve();
      })
      .catch((err) => {
        if (launchedOk) {
          // Polling had already started; this is a runtime failure (e.g. a
          // second bot instance triggering a 409 Conflict), not a startup
          // failure — log and keep the process alive rather than crashing
          // mid-run, per this repo's never-crash-on-one-API-error invariant.
          logger.error(
            { err },
            "Telegram polling stopped unexpectedly; AEGIS is no longer receiving messages",
          );
        } else {
          // Handshake itself failed (e.g. invalid token) — genuinely
          // unrecoverable at startup, let main().catch's fatal path handle it.
          reject(err);
        }
      });
  });
}
