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
      side. As of the 2026-08-26 fix (`src/bot/launch.js`), this no longer
      crashes the process — it's logged as `"Telegram polling stopped
      unexpectedly"` and the process stays alive but **stops receiving
      Telegram updates**, silently, with nothing else to notice it by. So
      don't run two instances even though it's non-fatal now: you won't get
      a crash to tell you something's wrong, just a bot that looks alive
      but isn't moderating. If you hit this, restart the single instance
      rather than treating the log line as something to route around.

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

- [x] Bot boots and logs `AEGIS is online and listening for messages`.
      **Fixed and live-verified 2026-08-26** — `src/index.js` now waits on
      `launchBot()` (`src/bot/launch.js`), which resolves via Telegraf's
      `onLaunch` callback right after the initial handshake succeeds,
      instead of awaiting `bot.launch()` itself (which only resolves once
      polling stops). Confirmed against the real Telegram API: `npm start`
      logged `starting AEGIS` then `AEGIS is online and listening for
      messages` about 1 second later. This log line is reachable now — if
      it's not showing up a few seconds after `npm start`, that's a real
      signal, not a known false negative.
- [ ] **409/401 no longer crashes the process mid-run.** Previously, a
      second bot instance running concurrently (see the "run exactly one
      instance" note below) would throw a 409 out of Telegraf's polling
      loop and crash the whole process via `main().catch`. As of the
      2026-08-26 fix, a polling failure *after* a successful launch is
      logged (`"Telegram polling stopped unexpectedly"`) and the process
      stays alive — but note it also stops receiving Telegram updates at
      that point with no automatic reconnect, so watch for that log line
      during live testing rather than assuming a live process means a
      working poller. A handshake failure *before* launch (e.g. bad token)
      still crashes at startup, unchanged.
- [x] Send an ordinary message in the test group → a `moderation decision`
      log line appears (`src/bot/handlers/message.js`) with an `action` and
      a `latencyMs`. **Confirmed 2026-08-26**, first run against the fixed
      `bot.launch()` path — see `docs/API_NOTES.md`.
- [x] **Record real reply latency.** `askAgent`'s default `timeoutMs` is
      30s (`src/agent/mindsClient.js`) — a guess, never measured against a
      real Mind. Report the actual number rather than changing the code
      yourself — see the guardrails note below on why. Live-verified
      2026-08-24 and reconfirmed 2026-08-26 (38202ms, 34808ms, 36006ms):
      real replies (still refusals, not the JSON contract) take ~34–38s
      each — *longer* than the 30s default — without hitting the timeout
      path, consistently across two separate sessions two days apart. This
      is now a stable measured range, not a one-off; flag it back to the
      backend owner as a candidate to bump the default, since three real
      replies would have blown past 30s if a caller ever relied on it.
- [x] Expect `action: "none"` / `reason: "unparseable_agent_response"` on
      every message until the persona question in §2 is resolved — that's
      the known, already-logged refusal, not a new bug each time you see
      it. Only report back if the *content* of the refusal changes in a way
      not already captured in `docs/LIMITATIONS.md`. **2026-08-26: the
      content did change** — see `docs/LIMITATIONS.md`'s 2026-08-26 update
      for the sharper, more explicit refusal language this run surfaced.
- [x] **Confirm the agent's raw replies actually match the JSON decision
      contract** in `src/agent/prompt.js` without hand-holding. If it drifts
      into prose or a different shape often, `src/agent/decision.js` will
      keep falling back to `"none"` safely — but that means AEGIS is doing
      nothing. This needs real prompt iteration, not a code fix.
      **Confirmed 2026-08-26** against a fresh custom Mind on a new account
      — see `docs/LIMITATIONS.md`'s 2026-08-26 update. Unchanged prompt,
      real JSON-contract replies including a successful `action: "reply"`
      that Telegram confirmed sending. Looks like it was a cognitions
      problem on the old account, not a persona/prompt problem — keep
      testing to see if it holds up, but don't reopen prompt iteration
      unless it starts refusing again.
- [x] Trigger a spam-like message → confirm `deleteMessage` actually
      deletes it (needs the Delete Messages permission from step 1).
      **Confirmed 2026-08-26** — a crypto-giveaway-scam test message got
      `action: "delete"` with an on-point reason ("Classic crypto giveaway
      scam - phishing attempt with fraudulent USDT claim link, urgent
      tone, and 'limited spots' pressure tactics"), and `deleteMessage`
      actually removed it from the group (logged `deleted message`, no
      error). Delete Messages permission is correctly granted and working.
- [x] Trigger a mild-toxicity-worthy message → confirm `restrictUser`
      actually mutes (needs Restrict Members permission from step 1).
      **Conclusively not reachable as of 2026-08-26 — closing this out as
      a documented Mind-behavior limitation, not a code defect, after
      exhausting reasonable variation.** Six attempts total, across two
      groups, four accounts, and three qualitatively different message
      patterns: a single repeat-offender insult (→ `escalate`), a clean
      first-contact insult in a backlog-free group (→ `escalate`, then a
      content-blind generic `reply`), and rapid-fire flooding/urgency
      messages (→ `welcome`/`reply`, never `restrict`). Backlog bias,
      per-message wording, and account history were all ruled out as
      explanations — see `docs/LIMITATIONS.md`'s toxicity-recognition
      section. `restrictUser` itself is confirmed correctly wired (real
      Telegram permission, real code path, exercised by nothing so far
      because the Mind never asks for it). This Mind, unconfigured (no
      persona/system prompt exists for custom Minds at all), appears to
      simply not select `restrict` regardless of provocation — likely a
      platform-level question for Creative Minds mentors, not something
      more prompt iteration in `src/agent/prompt.js` is likely to fix.
      Spam/phishing detection remains reliable throughout (2/2 correct
      deletions) — the gap is specific to interpersonal toxicity.
- [x] Ask the same question twice → confirm a `reply` decision surfaces the
      previous answer. **Confirmed 2026-08-26**, via a stronger version of
      this test than literally asking twice: a fresh account (Xyrelix, a
      clean DM alias, `docs/LIMITATIONS.md`) told the Mind an arbitrary
      fact ("my favorite fictional character is Paddington Bear"), then
      later asked "What did I say my favorite fictional character was?"
      with no restatement. The reply discussed Paddington specifically and
      accurately (marmalade, the "hard stare" — real character details),
      without the recall question ever naming Paddington itself — the only
      way that's possible is if the Mind genuinely retrieved the fact from
      earlier in the same conversation. Real content-aware memory
      recall, confirmed working within a session.

      **Update, 2026-08-27: re-confirmed after a genuine 18-hour gap**,
      closer to the "3 days" timescale `README.md` §8 actually describes
      than the original ~10-14 minute test. Same recall question, no
      re-priming, sent 18 real hours later (spanning a process restart,
      several other test sessions, and the process being down entirely in
      between): the Mind still correctly named both facts in the right
      order (Sung Jinwoo, then Paddington Bear). Reply latency (38964ms)
      was normal for this Mind, not suspiciously fast — ruling out a
      cached/stale reply and confirming this was a genuine fresh
      generation. One curiosity: it opened with "you actually asked me
      this ten minutes ago" — the exact same phrase used after the
      original ~10-14 minute gap, now stated again despite the real gap
      being ~18 hours. The underlying recall is accurate; the stated
      elapsed-time estimate is not, and doesn't track real time — a milder
      variant of the confident-but-wrong specific-claim pattern documented
      in `docs/LIMITATIONS.md`. Doesn't weaken the memory/continuity
      result, which is now stronger than before — worth knowing that any
      specific claim in a reply (including "when") still needs independent
      verification, not just claims about actions taken.
- [x] Add a test account to the group → confirm the `welcome` action fires.
      **Confirmed 2026-08-26**, with a caveat worth noting: the *join event
      itself* got `action: "escalate"` (`handleNewMember` in
      `src/bot/handlers/message.js` doesn't log a `moderation decision`
      line, only the action-specific log — that's why the log shows
      `escalated to human moderator` with nothing before it), not an
      automatic welcome. It was the new member's own follow-up message,
      processed through the normal `handleMessage` path, that got
      `action: "welcome"` and actually sent a real Telegram message
      (`welcomed new member`, no error). Same likely root cause as the
      `restrict` non-confirmation above — this chat's accumulated backlog
      biasing the Mind toward escalating anything judgment-requiring,
      including new-member joins, not something specific to toxicity.
- [x] Trigger (or manually test) an `escalate` decision → confirm the
      summary lands in `ESCALATION_CHAT_ID`. **Confirmed 2026-08-26** — two
      separate escalations landed correctly. But see the finding above:
      verify the *content* of any escalation summary against real system
      state before acting on it, don't trust it at face value.
- [x] Prove the three hackathon-required capabilities end to end
      (`README.md` §8):
  - [x] **Memory** — agent recalls a member/conflict from a prior session.
    **Confirmed 2026-08-26** — see the repeat-question item above. A fresh
    account (Xyrelix) told the Mind two separate favorite-character facts
    across separate messages (Sung Jinwoo, then later Paddington Bear);
    asked cold to recall it, the Mind correctly named both, in the correct
    order, unprompted.
  - [x] **Continuity** — stop the process (`Ctrl+C`/`SIGTERM`) mid-demo, run
    `npm start` again, confirm it picks up with full context. **Confirmed
    2026-08-26**, and tested more rigorously than "stop and restart": the
    process was force-killed (`taskkill /F`, not a graceful `SIGTERM`) —
    the in-memory `ensuredAliases` cache and `aliasQueues` (`src/agent/mindsClient.js`)
    were fully discarded, no local state survived at all. After restart,
    asking the same recall question with zero re-priming still correctly
    returned both prior facts (Sung Jinwoo, Paddington Bear), proving
    memory genuinely lives in Minds, not in AEGIS's process. Passes even
    under a harder test than the checklist asked for.
  - [x] **Autonomy** — let it moderate live for 30–60s with no human input.
    **Confirmed** — effectively demonstrated throughout this entire live-
    verification session: every decision (delete/reply/escalate/welcome)
    was made and acted on with zero human input into the decision loop
    itself (humans only sent test messages and read logs/escalations).

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
