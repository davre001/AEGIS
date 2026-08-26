# Limitations

What AEGIS's backend does not handle yet, stated plainly rather than left
for a reviewer to discover.

## Live agent run (2026-08-18 to 2026-08-20): persona mismatch, not credits

First real runs against a live Mind surfaced a persona/system-prompt
mismatch — not a code bug. It degraded safely to `"none"` per the
decision-contract invariant both times, but doesn't let AEGIS actually
moderate yet:

- **Persona/system-prompt mismatch.** The Mind is configured on the
  builder dashboard with its own "companion mind" persona and repeatedly
  refused to adopt the AEGIS moderation role and JSON contract from
  `src/agent/prompt.js`'s in-message framing ("I don't take on roles like
  that on demand"). As documented in `docs/API_NOTES.md`, the Minds SDK has
  no separate system-instruction parameter — a Mind's persona is set once
  on the dashboard and applies to every message. **This Mind's
  dashboard-configured system prompt needs to be set to the AEGIS
  moderation role directly; prepending instructions per-message is not
  sufficient on its own.** As of 2026-08-20 the official docs
  (build.hellominds.ai/docs and its CLI reference) don't document where
  that's configured via API/CLI — it appears to live only in the dashboard
  UI, in a settings/edit view not yet located.
- **Correction, 2026-08-20:** the Mind's replies repeatedly claimed "I'm
  out of cognition credits" with a top-up link, and this was logged here
  as a real blocker on 2026-08-18. The account dashboard
  (build.hellominds.ai) shows **117.70 cognitions available (~3 days
  left)** as of 2026-08-20 — the claim was false, fabricated by the Mind
  as part of its refusal, not a real account/billing state. **Lesson:**
  text inside an unparseable/non-contract agent reply is not verified
  fact, even claims that sound like system state — it must be checked
  against an independent source (here, the dashboard) before being
  recorded as a real blocker or acted on, same as the project's core
  invariant about never acting on an unvalidated decision.

`parseDecision` (`src/agent/decision.js`) correctly fell back to `"none"`
on both the timeout and the malformed-prose reply, so a Mind that isn't
configured correctly degrades to inaction rather than a crash or a wrong
action. Real reply latency and JSON-contract adherence with a
correctly-configured Mind are still unmeasured — retest once the persona
is set to the AEGIS moderation role.

### Update, 2026-08-20: reworked the prompt to work with the persona — still refused, with a sharper root cause

AEGIS is a submission to Creative Minds Jam #1 (dorahacks.io), whose rules
require the Mind to stay the core decision-maker — so instead of replacing
Minds, `src/agent/prompt.js`'s framing was rewritten to speak to the Mind as
itself ("help me look after this community") rather than instructing it to
become a different persona ("You are AEGIS..."). It still refused, but the
reply revealed something more specific than a tone/persona mismatch:

> "the messages that look like this — structured prompts telling me who I
> am and what format to reply in — are not how I hear your actual voice...
> I'd rather hear from you in your own words than keep responding to these
> as if they were requests from you."

The Mind is distinguishing organic human chat (a plain "hello" typed in the
dashboard) from **programmatically-constructed, templated messages** —
and treating that structural pattern itself as suspicious, independent of
what the message says or how warmly it's worded. That means this isn't
purely a prompt-wording problem: any integration that sends an automated,
templated prompt on every incoming Telegram message (which a moderation
bot inherently must do) may hit the same detection regardless of phrasing.
This looks like a platform-level question — likely one other Jam
participants building automated Minds integrations also need answered —
worth raising with Creative Minds mentors/office hours rather than
continuing to iterate on wording alone.

Also reconfirmed: the reply again claimed "still running on low cognition
credits" — the same false claim corrected above on 2026-08-20, recurring
under the new framing too. Treat any credits/system-state claim inside a
Mind's reply as unverified until checked against the dashboard.

### Update, 2026-08-24: same refusal reproduced over real Telegram traffic

Live bot (correct token, correct permissions, group privacy off, no
dashboard-side Telegram connector linked to the Mind) received real group
messages and every one round-tripped end to end — Telegram → `askAgent` →
`parseDecision` — landing on `action: "none"`,
`reason: "unparseable_agent_response"` per `parseDecision`'s safe-fallback
contract. The raw replies are the same persona-refusal pattern documented
above, now confirmed under real traffic rather than only manual/dashboard
testing. Real reply latency for this path: ~34–38s per reply (recorded in
`docs/API_NOTES.md`). Not a new bug — same open item, independently
reconfirmed.

### Update, 2026-08-24: dashboard independently confirms 0.00 cognitions on every Mind

Distinct from the false "I'm out of cognition credits" claim corrected
above (that came from inside an unparseable agent reply, and was checked
against the dashboard on 2026-08-20 and found false at the time — 117.70
available). This time the **operator read the dashboard directly**, not a
Mind's self-report: every Mind currently shows **0.00 cognitions
available**. This is a real, independently-verified constraint, not a
repeat of the earlier false claim, and it reframes the root-cause
investigation above — a Mind with zero cognition budget may be unable to
run full reasoning to produce the JSON decision contract at all,
regardless of persona/system-prompt configuration. The persona-mismatch
theory documented in this file may have been correlated with, rather than
the root cause of, the refusal pattern. Needs retesting once cognitions are
topped up before drawing further conclusions either way. Per the Creative
Minds Jam rules, eligible participants can request a cognition boost from
Animoca Brands/Minds by Animoca Brands — no confirmed self-serve top-up
path found yet.

### Update, 2026-08-26: refusal reconfirmed post-fix, with a sharper, more explicit root cause

First live run against real Telegram traffic since the `bot.launch()` fix
(see the "No recovery after a runtime Telegram polling failure" section
below). Three ordinary group messages round-tripped end to end and all
three landed on `action: "none"` / `reason: "unparseable_agent_response"`,
same safe-fallback contract as every prior run — not a new bug, the same
open item, reconfirmed under the fixed code path.

The refusal language this time is more explicit than the "not how I hear
your actual voice" phrasing recorded 2026-08-20. The Mind now states the
refusal directly in mechanical terms: *"I'm not going to output that JSON
schema for you. I'm not the mod bot."* — naming the JSON-contract request
itself as the thing it's declining, not just objecting to tone/framing.
This is a stronger, more specific signal than earlier runs and worth
leading with when raising this with Creative Minds mentors.

**Notable side observation, not yet confirmed as reliable:** the same
replies show the Mind distinguishing new messages from earlier ones within
the conversation ("same wrapper, same answer" / "the inner content this
time isn't a probe... reads like an actual person") — i.e. it appears to
be tracking conversation history within a thread, independent of the
JSON-contract refusal. This is *not* the same claim as the cross-alias
memory question above (which is about memory bleeding across distinct
Telegram chats/aliases) — this is ordinary single-conversation history,
which `ensureConversation`'s alias binding would provide regardless. Noted
here only because it's the first concrete evidence the memory mechanism is
functioning at all; it does not confirm the hackathon's cross-session
continuity requirement (`README.md` §4A), which still needs its own
dedicated test (stop/restart the process, confirm recall).

One of the three test messages arrived with `chatId` equal to `senderId`
(`1770749476`), i.e. a Telegram DM to the bot rather than a group message
(`chatId: -1004368201540` for the other two) — worth double-checking
whether that was an intentional DM test or a stray message, since the
live-verification checklist in `INTEGRATOR.md` calls for group messages
specifically.

## No persisted reconciliation for ambiguous sends

`sendMessage` to Minds has no client-supplied idempotency key in this SDK
version (see `docs/API_NOTES.md`). We handle this by *not* retrying a send
on anything but a 429 (see the read/write retry-policy split in
`src/agent/mindsClient.js`), rather than by building a full
PENDING/CONFIRMED/FAILED/UNKNOWN reconciliation state machine with
persisted records and a background reconciler.

This is a deliberate scope call, not an oversight: the worst case of an
ambiguous send here is one missed or (if we ever did retry blind)
duplicated moderation decision on a single chat message — bounded,
recoverable on the next message, and logged. That's a different risk
profile from a payment/execution system, where the same ambiguity can mean
silently losing or double-sending money. If AEGIS grows features where a
missed decision is costly (e.g. an irreversible ban that should have been
a warning), revisit this and adopt the reconciliation pattern.

## No recovery after a runtime Telegram polling failure

Fixed 2026-08-26: `src/index.js` previously crashed the whole process if
Telegram's long-polling loop died mid-run (e.g. a 401/409 from running a
second bot instance concurrently) — a violation of this project's own
never-crash-on-one-API-error invariant, tracked in `INTEGRATOR.md`.
`src/bot/launch.js`'s `launchBot()` now distinguishes a startup handshake
failure (still crashes — genuinely unrecoverable) from a post-launch
polling failure (logged via `"Telegram polling stopped unexpectedly"`,
process stays alive).

What's still missing: once polling dies post-launch, nothing attempts to
restart it, and there's no signal beyond that one log line — no changed
`process.exitCode`, no health check, no metric a process supervisor
(systemd/pm2) could key off. The process looks alive but is no longer
moderating anything. This is a deliberate scope call for now, not an
oversight: building reconnect-with-backoff or a liveness endpoint is more
machinery than a single-process MVP needs, and an operator watching logs
will see the error line. If AEGIS moves to unattended/supervised
deployment, revisit this and add an explicit liveness signal.

## No startup verification of Telegram bot permissions

`deleteMessage` and `restrictUser` (`src/actions/`) assume the bot has
admin rights with delete/restrict permissions in the group. If it doesn't,
the Telegram API call throws, gets logged, and the moderation action
silently doesn't happen — there's no startup check that warns "this bot
isn't an admin here" before the first real spam message arrives.

## No backpressure beyond per-chat serialization

`src/agent/mindsClient.js` queues calls per Telegram chat (alias) so a
single busy chat can't race itself against the same Minds conversation.
There's no cross-chat rate limiting or Minds API quota awareness — if AEGIS
is deployed across many active communities at once, nothing currently
protects against overrunning a rate limit or cost budget on the Minds side
beyond the 429-retry-with-backoff already in place.

## No independent spam/toxicity backstop

Every moderation decision comes from the Minds agent's classification.
There's no local heuristic (e.g. a hardcoded link-flood counter) acting as
a backstop if the agent is slow, down, or `waitForReply` times out — in
that case `parseDecision` returns `"none"` and the message is simply not
acted on.

## No dashboard

Per the project's own MVP scope (`README.md`), a creator-facing dashboard
was explicitly "nice to have," not required. All decision/action activity
is currently only visible as structured `pino` logs, not a UI.

## Single-process only

No horizontal scaling story — one bot process holds the in-memory
`ensuredAliases` cache and `aliasQueues`. Running multiple instances would
duplicate `ensureConversation` calls (harmless, it's idempotent) but would
break the per-alias serialization guarantee, since queues aren't shared
across processes.
