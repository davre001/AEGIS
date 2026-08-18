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
- **Client init:** `createMindsClient(options)` does **not** read the API
  key from the environment itself — `BUILDER_API_KEY_ENV` exported by the
  package is just the string constant `"MINDS_BUILDER_API_KEY"` (a naming
  convention for callers), not something the SDK reads via `process.env`
  internally (verified by grepping the installed `dist/index.js`: no
  `process.env` reference anywhere in the package). The key must be passed
  explicitly: `createMindsClient({ builderApiKey: config.mindsBuilderApiKey })`,
  as done in `src/agent/mindsClient.js`. Omitting it doesn't throw at
  `createMindsClient()` call time — it throws `missing_builder_api_key`
  later, the first time an authenticated call is actually made
  (`requireBuilderApiKey` inside `buildMindsClient`). This is a runtime
  throw, not caught by our own env validation in `src/config.js` (which
  only checks the var is *set*, not that Minds accepts it).
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
- **No system-prompt/persona parameter anywhere in the SDK.** Verified by
  reading `createConversation`, `sendMessage`, and `ensureConversation` in
  the installed `dist/index.js`: their request bodies only ever carry
  `alias`, `mindId`, and message text/content — there is no field for
  per-request system instructions. A Mind's persona/system prompt is
  configured once on the builder dashboard (build.hellominds.ai) and
  applies to every conversation with that Mind; `SYSTEM_FRAMING` in
  `src/agent/prompt.js` is just plain text prepended into the message body,
  not a privileged instruction channel. **Consequence:** if a Mind's
  dashboard-configured persona conflicts with the moderation role AEGIS
  asks it to play in-message, the Mind can and does refuse in prose instead
  of returning the JSON decision contract (observed live 2026-08-18 — see
  `docs/LIMITATIONS.md`). The Mind used for AEGIS moderation must have its
  actual system prompt/persona set on the builder dashboard to match the
  moderation role; in-message framing alone is not reliable.
- **Live-verified 2026-08-18** (first real run against a live Mind):
  `waitForReply`'s 30s default timeout was hit twice with no reply at all
  before any reply arrived — consistent with the account being out of
  cognition credits (see `docs/LIMITATIONS.md`) rather than normal latency.
  Real steady-state reply latency with credits available and a
  correctly-configured persona is still unmeasured.

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
