# Limitations

What AEGIS's backend does not handle yet, stated plainly rather than left
for a reviewer to discover.

## Live agent run (2026-08-18): out of credits + persona mismatch

First real run against a live Mind surfaced two account-level blockers, not
code bugs — both degraded safely to `"none"` per the decision-contract
invariant, but neither lets AEGIS actually moderate yet:

- **Out of cognition credits.** The Mind's replies included an explicit
  "I'm currently out of cognition credits" message with a top-up link. The
  two `waitForReply` timeouts immediately before that in the same session
  are almost certainly the same cause. Needs a human to top up credits on
  build.hellominds.ai for this Mind before further live testing is useful.
- **Persona/system-prompt mismatch.** The Mind is configured on the
  builder dashboard with its own "companion mind" persona and explicitly
  refused to adopt the AEGIS moderation role and JSON contract from
  `src/agent/prompt.js`'s in-message framing ("I don't take on roles like
  that on demand"). As documented in `docs/API_NOTES.md`, the Minds SDK has
  no separate system-instruction parameter — a Mind's persona is set once
  on the dashboard and applies to every message. **This Mind's
  dashboard-configured system prompt needs to be set to the AEGIS
  moderation role directly; prepending instructions per-message is not
  sufficient on its own.**

`parseDecision` (`src/agent/decision.js`) correctly fell back to `"none"`
on both the timeout and the malformed-prose reply, so a Mind that isn't
credited or isn't configured correctly degrades to inaction rather than a
crash or a wrong action. Real reply latency and JSON-contract adherence
with a properly credited, correctly-configured Mind are still unmeasured —
retest once both blockers above are resolved.

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
