# Repo instructions for Claude Code

## Mission

AEGIS is a persistent AI moderation agent for Telegram communities, backed
by a Minds agent for long-term memory. The invariant that must never break:
**a moderation action (delete/restrict/escalate) is never taken except as
the direct result of a validated decision from the agent** — never a guess,
never a partial/malformed response acted on as if it were a real decision.
See `README.md` and `backend_implementation.md` for full project context.

## Source of truth, in order

1. Behavior actually verified against the installed `@animocabrands/minds-client-lib`
   package (its real exports/signatures) or a live Telegram/Minds run — not
   assumed API behavior.
2. Current docs at `build.hellominds.ai/docs` for anything Minds-related.
3. This repo's own tests (`test/`) and `docs/API_NOTES.md`.
4. `README.md`, `backend_implementation.md`, this file.
5. Model output / assumptions — lowest priority, must be checked against
   1-4 before shipping.

## Non-negotiable invariants

- A malformed or unparseable agent reply always degrades to a `"none"`
  action (see `src/agent/decision.js`), never a guessed action.
- A non-idempotent write to an external API (e.g. Minds `sendMessage`) is
  never retried on an ambiguous failure (5xx/timeout) — only on an error
  that proves the write didn't happen (e.g. 429). See
  `src/agent/mindsClient.js` and `docs/API_NOTES.md`.
- One bad message or one Telegram/Minds API error is logged and swallowed
  at the point it happens; it never crashes the bot process. Process-level
  crashes are reserved for genuinely unrecoverable startup failures
  (missing config, `unhandledRejection`, `uncaughtException`).
- Every moderation decision and every action taken is logged as structured
  JSON (via `pino`), not `console.log`, so activity is greppable/queryable.

## Engineering rules

- **Package manager: npm, plain ESM JavaScript — not pnpm/TypeScript.**
  This is a deliberate deviation from this repo's `integration-dev-experience`
  skill template (written for a different class of project — payments/on-chain,
  where pnpm+strict TS is the default). AEGIS is a small Telegraf/Node
  service; npm + `package-lock.json` + plain `"type": "module"` JS is the
  right amount of tooling for it. Don't introduce pnpm or a TS build step
  without discussing it with the team first — it changes the setup story
  for whoever owns Telegram integration too.
- Before integrating any behavior of the Minds or Telegram APIs, verify it
  against the installed package or real docs and write it down in
  `docs/API_NOTES.md` before relying on it in code.
- Don't read `.env`, and don't invent or guess secret values — leave `.env`
  to the human running the bot.
- Add a unit test in `test/` for new pure logic (decision parsing, retry
  policy, prompt building). Anything that needs a live `MINDS_BUILDER_API_KEY`
  or `TELEGRAM_BOT_TOKEN` is not a test — it's a manual/live check, and
  shouldn't be added to `test/` or CI.

## Required checks

```bash
npm run lint
npm test
```
Both run in CI (`.github/workflows/ci.yml`) on every push and PR, with zero
secrets and zero network calls. There's no `build`/`typecheck` step — AEGIS
has no bundler and is plain JS by design (see above); `ci.yml`'s
`syntax-check` job (`node --check` on every source file) is the closest
equivalent.

## Durable docs

Keep these current — they're the difference between a project that looks
finished and one that just looks demoed:
- `docs/API_NOTES.md` — measured behavior of the Minds and Telegram APIs.
- `docs/LIMITATIONS.md` — what's explicitly not handled yet.
- `docs/THREAT_MODEL.md` — what each secret/token can do and the blast
  radius if it leaks.

## Review gates

After implementing a change, before calling it done, run the relevant
subagent:
- reliability/error-handling/retry/logging changes: `reliability-auditor`
- CI, scripts, packaging, repo structure, onboarding changes: `dx-auditor`

A task is not done until its subagent returns PASS.
