# API Notes

Measured/documented behavior of the external APIs AEGIS depends on. Update
this file when reality contradicts it — this is a record of what we've
actually verified, not what we assume.

## Minds (`@animocabrands/minds-client-lib`)

Source: https://build.hellominds.ai/docs (fetched 2026-08-17), confirmed
against the installed package (`node_modules/@animocabrands/minds-client-lib`,
version pinned in `package.json`) by inspecting its real exports and method
signatures — not just the docs.

- **Requires Node 22+.** The original planning doc guessed Node 20+; the
  package itself enforces 22+. We're on Node 24, so this is fine, but flag
  it if a teammate is on an older Node.
- **Auth:** `MINDS_BUILDER_API_KEY` env var (exported as `BUILDER_API_KEY_ENV`
  from the package), sent as the `X-Api-Key` header. `X-Access-Key` /
  `--access-key` are deprecated — don't use them.
- **Client init:** `createMindsClient()` takes no arguments in the
  documented/observed usage; it reads the API key from the environment
  itself. Throws `missing_builder_api_key` at call time if the key is
  absent — this is a runtime throw, not caught by our own env validation in
  `src/config.js` (which only checks the var is *set*, not that Minds
  accepts it).
- **Conversation model:** a Mind is addressed indirectly through a stable
  `alias` string. `ensureConversation(alias, mindId)` binds an alias to a
  specific Mind and is idempotent — calling it again for an alias that's
  already bound does not error (verified by reading the installed source:
  it catches the "already exists" case internally). AEGIS uses one alias
  per Telegram chat (`telegram-<chatId>`) so each community's conversation
  — and therefore its memory — is isolated from every other community the
  bot serves.
- **Sending a message / getting a reply** is two calls, not one:
  1. `sendMessage({ alias, messageText })` — fire-and-forget write.
  2. `waitForReply({ alias, timeoutMs, afterFingerprint })` — polls history
     until a new reply lands after `afterFingerprint` or the timeout hits.
     `afterFingerprint` should be captured via `getLatestHistoryFingerprint(alias)`
     *before* calling `sendMessage`, so we know which reply is actually new.
  - **This is not one atomic call.** There is no built-in idempotency key on
    `sendMessage` in this SDK version. See `docs/LIMITATIONS.md` for what
    that means for retry safety.
- **Errors:** failures throw `MindsApiError` with `status`, `code`,
  `message`. Observed/documented codes: `missing_builder_api_key` (no key),
  401/403 (missing or revoked key), 429 (rate limited, retryable — the
  request was rejected before Minds acted on it). 5xx is undocumented in
  detail; we treat it as ambiguous (see reconciliation note below), not as
  "definitely failed."
- **Not yet verified against a live agent** (no `MINDS_BUILDER_API_KEY` /
  `MINDS_MIND_ID` in this environment): actual reply latency, whether
  `waitForReply`'s `timeoutMs` needs tuning up/down from the 30s default in
  `src/agent/mindsClient.js`, and whether the agent reliably returns the
  JSON decision contract we ask for in `src/agent/prompt.js` without
  drifting into prose. Test this the moment credentials exist — see
  `docs/LIMITATIONS.md`.

## Telegram (via `telegraf`)

- `deleteMessage` / `restrictChatMember` require the bot to be a group
  **admin** with the relevant permission (delete messages / restrict
  members). Not verified programmatically at startup — if the bot lacks
  the permission, these calls throw and we log-and-swallow the error in
  `src/actions/*.js` rather than crash, but the moderation action silently
  doesn't happen. See `docs/LIMITATIONS.md`.
- Telegram's own rate limits (roughly ~30 messages/sec bot-wide, ~1/sec per
  chat for `sendMessage`) are not yet handled with backoff on our side —
  Telegraf will throw a 429 from Telegram's API and our action handlers
  will log-and-swallow it, same as any other Telegram API error.
