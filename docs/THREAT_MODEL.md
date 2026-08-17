# Threat model

Kept short and current. Its job is to state trust assumptions explicitly
so they can be checked, not to be exhaustive.

## Trusted parties / keys

- `TELEGRAM_BOT_TOKEN` — full control of the bot's identity in every group
  it's a member of. With admin rights granted by a group owner, it can
  delete any message and restrict (mute) any non-admin member.
- `MINDS_BUILDER_API_KEY` — read/write access to every Mind and
  conversation this Builder account owns, including AEGIS's persistent
  memory of every community it moderates (member history, past conflicts,
  resolved questions).
- `ESCALATION_CHAT_ID` — not a secret/key, but a trust boundary: whoever
  can read that chat sees every escalation summary, which includes
  message content and the reasoning behind moderation decisions.

## What happens if each one is compromised

- If `TELEGRAM_BOT_TOKEN` leaks: an attacker can impersonate AEGIS in every
  group it's in — send messages as it, delete any message, mute any
  non-admin member, in any community it moderates. Bounded to Telegram-side
  damage (no access to Minds memory or other secrets); recoverable by
  revoking the token via @BotFather, which immediately invalidates it.
- If `MINDS_BUILDER_API_KEY` leaks: an attacker can read the full
  conversation/memory history for every community AEGIS moderates (member
  behavior patterns, past conflict details) and can send messages into
  those conversations, potentially corrupting the agent's memory or its
  future decisions. Does not by itself grant Telegram access. Recoverable
  by rotating the key in the Builder console.
- If `ESCALATION_CHAT_ID` is set to (or later includes) an untrusted party:
  they see moderation reasoning and message content for every escalated
  case, which may include personal disputes between members. This is a
  configuration decision, not a secret leak, but has real privacy weight —
  only humans a creator actually trusts as moderators should have access
  to that chat.

## What's explicitly out of scope

- No verification that the Telegram admin who added the bot actually
  granted only the intended permissions (delete + restrict) rather than
  full admin. AEGIS uses whatever permissions it's been given; it doesn't
  request or enforce a minimal set at runtime.
- No rate limiting or anomaly detection on the bot's own actions — e.g. if
  the Minds agent were tricked (via prompt injection in a message) into
  repeatedly returning `"restrict"` or `"delete"` decisions, nothing in
  `src/actions/` currently caps how many actions AEGIS takes in a given
  window. Every restrict/delete is logged, but nothing auto-pauses AEGIS
  if its own action rate spikes.
- No sanitization of message content before it's included in the prompt
  sent to Minds (`src/agent/prompt.js`) — a message is free-form user input
  and is passed through as part of the context. A malicious member could
  attempt prompt injection against the agent. Its blast radius is bounded
  by the decision contract (`src/agent/decision.js` only accepts one of six
  known actions and validates the shape), but the *reasoning* behind a
  decision could still be manipulated.

## Known limitations

See `docs/LIMITATIONS.md` for the full list, especially: no persisted
reconciliation for ambiguous Minds sends, no startup check that the bot
actually holds the Telegram permissions it needs, and no independent
backstop if the agent's judgment is wrong.
