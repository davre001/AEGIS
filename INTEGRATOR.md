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

## 2. Provision Minds

- [ ] Sign up at [build.hellominds.ai](https://build.hellominds.ai), create
      a Builder API key → `MINDS_BUILDER_API_KEY`.
- [ ] Create a Mind, copy its id → `MINDS_MIND_ID`.
- [ ] Open question `docs/API_NOTES.md` doesn't answer yet: whether/how to
      configure the Mind's own baseline persona on the Minds side, versus
      relying entirely on the per-message framing `src/agent/prompt.js`
      sends. Check the Minds docs/console for this and record what you find
      in `docs/API_NOTES.md` — right now the whole "AEGIS" persona is
      re-sent as part of every message, which may or may not be the
      intended pattern for this SDK.

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

- [ ] Bot boots and logs `AEGIS is online and listening for messages`.
- [ ] Send an ordinary message in the test group → a `moderation decision`
      log line appears (`src/bot/handlers/message.js`) with an `action` and
      a `latencyMs`.
- [ ] **Record real reply latency.** `askAgent`'s default `timeoutMs` is
      30s (`src/agent/mindsClient.js`) — a guess, never measured against a
      real Mind. Report the actual number rather than changing the code
      yourself — see the guardrails note below on why.
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
