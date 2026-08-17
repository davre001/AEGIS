import "dotenv/config";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  mindsBuilderApiKey: requireEnv("MINDS_BUILDER_API_KEY"),
  mindsMindId: requireEnv("MINDS_MIND_ID"),
  escalationChatId: requireEnv("ESCALATION_CHAT_ID"),
  logLevel: process.env.LOG_LEVEL || "info",
  nodeEnv: process.env.NODE_ENV || "development",
};
