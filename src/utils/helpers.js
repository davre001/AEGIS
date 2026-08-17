export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an async operation with exponential backoff.
 * Only retries when `isRetryable` says so, so we never retry things like
 * auth failures or bad-request errors that will just fail again.
 */
export async function withRetry(fn, { retries = 3, baseDelayMs = 500, isRetryable = () => true } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > retries || !isRetryable(err)) {
        throw err;
      }
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }
}

/**
 * Minds agent replies are free-form chat text, not guaranteed pure JSON
 * (models sometimes wrap it in prose or a code fence). Pull out the first
 * balanced {...} block and parse that instead of trusting JSON.parse on
 * the whole string.
 */
export function extractJsonObject(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    if (text[i] === "}") depth -= 1;
    if (depth === 0) {
      const candidate = text.slice(start, i + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    }
  }
  return null;
}
