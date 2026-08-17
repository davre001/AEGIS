# AEGIS

**Adaptive • Empathetic • Guardian • Intelligence • System**

**Creative Minds Jam #1 – Track 3: Moderation & Community Assistance**  
**Team: Group 1**  
**Platform: Telegram**  
**Powered by Minds by Animoca Brands**

---

## 1. Project Overview

**AEGIS** is a persistent AI agent that acts as a long-term, intelligent community moderator and caretaker for content creators on Telegram.

Unlike normal bots that only follow rigid rules, AEGIS:

- Learns the unique culture, tone, and unwritten rules of each community
- Remembers members, past conflicts, and previous decisions
- Handles routine moderation autonomously
- Escalates only complex or sensitive cases to humans
- Gets smarter the longer it runs

**Main Goal:**  
Free creators from hours of daily moderation so they can focus on creating, while keeping their Telegram communities healthy and welcoming.

---

## 2. The Problem We Solve

Creators who run Telegram groups face these daily problems:

- Spending 1–3 hours every day deleting spam, answering repeated questions, and handling mild toxicity
- Burnout from constant moderation
- Current bots are either too dumb or too aggressive
- New members feel lost
- Important community knowledge gets buried

AEGIS becomes the community’s permanent memory and first responder.

---

## 3. How AEGIS Works

Telegram Group Message
        ↓
Telegraf Bot receives message
        ↓
AEGIS (Minds Agent) analyzes with long-term memory
        ↓
Decision
   ├── Autonomous Action (delete / reply / restrict / welcome)
   └── Escalation to human moderators


### Key Capabilities (Must prove in demo)
- **Memory** – Remembers users and past events across days
- **Continuity** – Still remembers everything after bot restart
- **Autonomy** – Takes action without constant human input

---

## 4. Core Features

### Autonomous Actions
- Delete spam / bots / repeated links
- Reply to repeated questions with previous good answers
- Soft warnings for mild toxicity
- Temporary restrict (mute) when needed
- Welcome new members
- Redirect off-topic messages

### Smart Escalation
- Only escalates complex or sensitive cases
- Sends rich context + summary to moderators

### Long-term Learning
- Learns community norms over time
- Remembers positive members and troublemakers
- Improves decisions based on history

---

## 5. Tech Stack

| Component              | Technology                      |
|------------------------|---------------------------------|
| Runtime                | Node.js (v22+ — required by the Minds client library) |
| Telegram Framework     | **Telegraf**                    |
| Persistent Agent       | **Minds by Animoca Brands**     |
| Environment            | dotenv                          |
| Optional Storage       | lowdb or better-sqlite3         |

---

## 6. Folder Structure

aegis/
├── src/
│   ├── bot/
│   │   ├── bot.js
│   │   └── handlers/
│   │       └── message.js
│   ├── agent/
│   │   ├── mindsClient.js
│   │   ├── prompt.js
│   │   └── decision.js
│   ├── actions/
│   │   ├── deleteMessage.js
│   │   ├── sendReply.js
│   │   ├── restrictUser.js
│   │   ├── escalate.js
│   │   └── welcome.js
│   ├── utils/
│   │   ├── logger.js
│   │   └── helpers.js
│   └── index.js
├── .env
├── .env.example
├── package.json
├── README.md
└── IMPLEMENTATION.md


---

## 7. Implementation Plan

### Phase 1 – Foundation (Aug 17–19)
- [ ] Create Telegram bot with @BotFather
- [ ] Add bot to test group as admin (Delete + Restrict permissions)
- [ ] Setup Node.js + Telegraf + dotenv
- [ ] Bot comes online and logs messages
- [ ] Successfully connect to Minds agent

### Phase 2 – Basic Loop (Aug 20–22)
- [ ] Message → Minds Agent → Decision pipeline
- [ ] Implement Delete, Reply, and Escalate actions
- [ ] Test basic flow in real group

### Phase 3 – Intelligence & Persistence (Aug 23–25)
- [ ] Strong system prompt focused on memory and norms
- [ ] Prove memory survives bot restart
- [ ] Add soft moderation + repeated question handling
- [ ] Improve escalation quality

### Phase 4 – Polish & Demo (Aug 26–28)
- [ ] Reliable test scenarios
- [ ] Clean demo video (1.5–2 minutes)
- [ ] Final code cleanup + documentation

---

## 8. Environment Variables

```env
TELEGRAM_BOT_TOKEN=your_bot_token

MINDS_BUILDER_API_KEY=your_minds_builder_api_key
MINDS_MIND_ID=your_mind_id
ESCALATION_CHAT_ID=private_group_or_user_id

## 9. Suggested Responses

{
  "action": "delete" | "reply" | "restrict" | "escalate" | "welcome" | "none",
  "reason": "short explanation",
  "replyContent": "optional reply text",
  "restrictSeconds": 600,
  "escalationSummary": "detailed context for moderators"
}

