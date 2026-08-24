# Integrator tasks

This is your task list. Backend (bot code, decision engine, retries,
actions, tests, CI, lint) is built and has passed a strict reliability +
dev-experience audit — see `docs/LIMITATIONS.md` and `docs/API_NOTES.md`.
**Your job is everything neither of us can do from a laptop with no
credentials: provisioning the real Telegram bot and the real Minds agent,
and running the live verification that closes the "not yet verified" gaps
those docs call out by name.** If something here turns out to be broken in
the code itself, flag it back — don't route around it by writing new logic
in a new file.

## 1. Provision the Telegram bot

- [ ] Create a bot via [@BotFather](https://t.me/BotFather) → copy the
      token into `TELEGRAM_BOT_TOKEN`.
- [ ] **Do not use any "link this Mind directly to a Telegram bot" feature
      on hellominds.ai for this token.** The only integration path is:
      token → `.env` → this repo's own Telegraf process (`src/bot/bot.js`).
      A direct website link wires a *second*, independent channel to the
      same Mind — the Mind then receives the same conversation twice (once
      raw via Minds' own connector, once wrapped in AEGIS's JSON-contract
      prompt via this repo's SDK calls), which reproduces the persona-
      refusal behavior in `docs/LIMITATIONS.md` almost exactly (the Mind's
      own words: "structured prompts... are not how I hear your actual
      voice"). Live-verified 2026-08-24: unlinking a direct connection made
      no immediate difference in one retest, so this isn't confirmed as the
      *sole* cause — but it's a confirmed architectural mismatch with how
      this repo is built (see `README.md`/`backend_implementation.md`,
      Telegraf is the only intended Telegram integration) and must stay
      unlinked regardless while you keep investigating the refusal.
- [ ] Create (or pick) a test Telegram group.
- [ ] Add the bot to that group as **admin**, with specifically **Delete
      Messages** and **Restrict Members** permissions — not full admin.
      `docs/THREAT_MODEL.md` scopes the bot's trust to exactly those two
      abilities; don't hand it more than the code uses.
- [ ] **Nothing in the code checks this at startup** — `docs/LIMITATIONS.md`
      ("No startup verification of Telegram bot permissions") flags that
      explicitly. You have to confirm by hand that delete/restrict actually
      work (step 5) — a missing permission fails silently (logged, not
      crashed) rather than telling you loudly.
- [ ] **Run exactly one instance of the bot process at a time.** Telegram
      allows only one active consumer (poller or webhook) per bot token —
      a second instance (e.g. `npm run dev` left running in one terminal
      plus a manual `npm start` in another) throws a 409 from Telegram's
      side. Verified 2026-08-24 by reading `telegraf`'s own polling loop
      (`node_modules/telegraf/lib/core/network/polling.js`): a 401 or 409
      is re-thrown out of the polling loop, which crashes the whole AEGIS
      process (`process.exit(1)` in `src/index.js`'s `main().catch`) rather
      than logging and continuing. This contradicts this project's own
      "never crash the process" invariant (`CLAUDE.md`) — flag it back
      (see §6), don't try to fix it yourself.

## 2. Provision Minds

- [ ] Sign up at [build.hellominds.ai](https://build.hellominds.ai), create
      a Builder API key → `MINDS_BUILDER_API_KEY`.
- [ ] Create a Mind, copy its id → `MINDS_MIND_ID`.
- [ ] **This Mind should only ever be reached through the SDK** —
      `ensureConversation`/`sendMessage`/`waitForReply` from
      `src/agent/mindsClient.js` — never through a dashboard-configured
      connector to Telegram or any other chat platform. See §1's note on
      why a direct link creates a second, conflicting channel into the same
      Mind.
- [ ] Open question `docs/API_NOTES.md` doesn't answer yet: whether/how to
      configure the Mind's own baseline persona on the Minds side, versus
      relying entirely on the per-message framing `src/agent/prompt.js`
      sends. Check the Minds docs/console for this and record what you find
      in `docs/API_NOTES.md` — right now the whole "AEGIS" persona is
      re-sent as part of every message, which may or may not be the
      intended pattern for this SDK. As of 2026-08-24 this is still
      unresolved — every live message gets a prose refusal, not the JSON
      decision contract (see `docs/LIMITATIONS.md`'s 2026-08-24 update).

## 3. Escalation destination

- [ ] Decide where escalations go — a private mod chat or your own DM — and
      get its numeric chat id → `ESCALATION_CHAT_ID`. Whoever can read that
      chat sees full message content and the agent's reasoning for every
      escalated case (`docs/THREAT_MODEL.md`), so pick deliberately.

## 4. Local setup — should need zero live credentials to get this far

**Requires Node ≥22** (`package.json`'s `engines` field enforces this — the
Minds client library needs it; see `docs/API_NOTES.md`). If `npm install`
or `npm test` fail with a confusing error, check `node --version` first.

```bash
cp .env.example .env
# fill in the four vars above
npm install
npm run lint && npm test
```
`lint`/`test` are pure-logic checks with no network calls and no real
secrets — they must pass regardless of whether your credentials are even
valid yet. **If either fails here, that's a backend bug, not a
credentials problem — stop and flag it rather than debugging your keys.**

Before you push anything, confirm `package-lock.json` is committed
(`git status`) — CI runs `npm ci`, which hard-fails without it.

Only after lint/test pass:
```bash
npm start
```

## 5. Live verification — this is the actual integration work

Everything below is currently unverified because this environment has no
live Minds/Telegram credentials. Each item maps to a named gap in
`docs/API_NOTES.md` or `docs/LIMITATIONS.md` — go close them, then report
back (step 6).

- [ ] ~~Bot boots and logs `AEGIS is online and listening for messages`~~ —
      **this log line is currently unreachable, don't wait for it.**
      Verified 2026-08-24 by reading `telegraf`'s `launch()`
      (`node_modules/telegraf/lib/telegraf.js`): it `await`s
      `startPolling()`, which only returns once the bot stops — so
      `src/index.js`'s `await bot.launch()` blocks for the entire time the
      bot is running, and the line right after it never executes during
      normal operation. This is a real code bug (Telegraf's own docs call
      `bot.launch()` *without* `await`), but it's a docs/log-line problem,
      not a sign the bot is down — flag it back (§6), don't fix it
      yourself. **The real "is it up" signal:** the process is still alive
      (no crash, no `"failed to start AEGIS"` fatal log) a few seconds after
      `npm start`.
- [ ] Send an ordinary message in the test group → a `moderation decision`
      log line appears (`src/bot/handlers/message.js`) with an `action` and
      a `latencyMs`.
- [ ] **Record real reply latency.** `askAgent`'s default `timeoutMs` is
      30s (`src/agent/mindsClient.js`) — a guess, never measured against a
      real Mind. Report the actual number rather than changing the code
      yourself — see the guardrails note below on why. Live-verified
      2026-08-24: real replies (still refusals, not the JSON contract) took
      ~34–38s each — *longer* than the 30s default — without hitting the
      timeout path. Don't be alarmed if you see similar numbers; do flag it
      back if you see the actual `"minds agent reply timed out"` warning.
- [ ] Expect `action: "none"` / `reason: "unparseable_agent_response"` on
      every message until the persona question in §2 is resolved — that's
      the known, already-logged refusal, not a new bug each time you see
      it. Only report back if the *content* of the refusal changes in a way
      not already captured in `docs/LIMITATIONS.md`.
- [ ] **Confirm the agent's raw replies actually match the JSON decision
      contract** in `src/agent/prompt.js` without hand-holding. If it drifts
      into prose or a different shape often, `src/agent/decision.js` will
      keep falling back to `"none"` safely — but that means AEGIS is doing
      nothing. This needs real prompt iteration, not a code fix.
- [ ] Trigger a spam-like message → confirm `deleteMessage` actually
      deletes it (needs the Delete Messages permission from step 1).
- [ ] Trigger a mild-toxicity-worthy message → confirm `restrictUser`
      actually mutes (needs Restrict Members permission from step 1).
- [ ] Ask the same question twice → confirm a `reply` decision surfaces the
      previous answer.
- [ ] Add a test account to the group → confirm the `welcome` action fires.
- [ ] Trigger (or manually test) an `escalate` decision → confirm the
      summary lands in `ESCALATION_CHAT_ID`.
- [ ] Prove the three hackathon-required capabilities end to end
      (`README.md` §8):
  - **Memory** — agent recalls a member/conflict from a prior session.
  - **Continuity** — stop the process (Ctrl+C / `SIGTERM`) mid-demo, run
    `npm start` again, confirm it picks up with full context. Memory lives
    in Minds, not locally, so this should hold — but it's never been run.
  - **Autonomy** — let it moderate live for 30–60s with no human input.

## 6. Report back — update the docs, don't just verify silently

- [ ] Fill in the "Not yet verified against a live agent" part of
      `docs/API_NOTES.md` with what you actually measured.
- [ ] If the bot is missing a permission or a Telegram API call behaves
      differently than documented, update `docs/LIMITATIONS.md` and/or
      `docs/API_NOTES.md` — or flag it back if it looks like a code bug.
- [ ] **Never commit `.env` or paste a real token/key into git, Slack, or
      Discord.** If one leaks, rotate it immediately — see
      `docs/THREAT_MODEL.md` for exactly what each credential can do if
      compromised.

## Guardrails to follow while you work (from this repo's skills)

- If you write any script that needs your live credentials (a manual demo
  runner, a one-off smoke test against the real Mind), name its
  `package.json` script with a `live:` prefix (e.g. `live:demo`) so it's
  never confused with `npm test`, which must stay credential-free forever.
- Don't wire real secrets into GitHub Actions / `.github/workflows/ci.yml`.
  CI is designed to run with zero secrets — live verification stays local,
  on your machine, with your own `.env`.
- Keep `README.md`'s setup instructions in sync — if anything about setup
  changes while you're doing this, fix the doc in the same PR, not later.
- **Don't edit reliability-sensitive code yourself** — anything in
  `src/agent/mindsClient.js` (retry policy, timeouts) or `src/agent/decision.js`
  (the decision contract). `CLAUDE.md`'s review-gate rule requires the
  `reliability-auditor` subagent to PASS any such change before it's done.
  If live testing shows the timeout, retry counts, or prompt contract need
  to change, report the numbers/findings back rather than changing the code
  directly — the backend owner runs the change through that gate.
