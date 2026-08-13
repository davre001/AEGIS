# AEGIS
 
---

## 1. Project Overview (What are we building?)

**AEGIS** is a persistent AI agent that acts as a long-term, intelligent moderator and community caretaker for content creators.

Unlike traditional bots that only follow fixed rules (e.g. “delete messages containing X word”), this agent:

- Learns the unique culture, tone, and unwritten rules of each community over time
- Remembers past conversations, conflicts, and positive members
- Makes context-aware decisions
- Acts autonomously while escalating only the important cases to humans

**Core goal**: Free creators from hours of daily moderation work so they can focus on creating content, while keeping their communities healthy and welcoming.

---

## 2. The Real Problem We Are Solving

Creators who run communities (Discord, Telegram, YouTube Community posts, etc.) face these daily pains:

- Spending 1–3 hours every day deleting spam, answering the same questions repeatedly, and handling mild toxicity
- Losing creative energy and getting burnout
- Current bots are dumb: they either ban too aggressively or miss context
- New members feel lost, veterans get tired of answering the same things
- Important community knowledge (old helpful posts, past resolutions) gets buried

Our agent directly attacks these problems by becoming the community’s permanent memory and first responder.

---

## 3. How It Works (High-Level Flow)


### Step-by-step process:

1. **Ingest**  
   The agent continuously receives messages from the connected platform (Discord / Telegram / etc.).

2. **Understand Context**  
   Using its persistent memory, the agent looks at:
   - Who is speaking (new member? known positive member? previous troublemaker?)
   - What has happened in this conversation before
   - Community norms it has learned over days/weeks
   - Similar past situations and how they were resolved

3. **Decide**  
   The agent classifies the message into categories:
   - Spam / Bot
   - Repeated question
   - Mild toxicity / off-topic
   - Positive contribution
   - Complex / sensitive issue

4. **Act Autonomously** (most cases)
   - Delete or hide spam
   - Softly warn for mild issues
   - Reply with the correct answer by surfacing an old helpful post
   - Welcome new members and pair them with veterans
   - Silently log everything for learning

5. **Escalate** (only when needed)
   - Sends a clean summary + full context to the human moderator (creator or trusted mods)
   - Waits for human decision and learns from it

6. **Learn & Improve**
   - Every action and human feedback is stored in the agent’s long-term memory
   - Over time the agent becomes more accurate and gentler/stricter according to the community’s real culture

---

## 4. Detailed Features

### A. Core Persistence Features (Must-have for the hackathon)
- **Long-term Memory**: Remembers individual members, past conflicts, community rules, and successful interventions across days and sessions
- **Continuity**: When the agent restarts, it continues exactly where it left off — no loss of knowledge
- **Autonomous Action**: Performs moderation tasks without waiting for human input most of the time

### B. Moderation Capabilities
- Auto-detect and handle spam / repeated links / bots
- Detect repeated questions and reply with previous good answers
- Contextual soft moderation (e.g. “Hey, we keep this channel focused on X — here’s a better place”)
- Escalation system with full conversation history + agent reasoning

### C. Community Care Features
- Smart welcome messages for new members
- Suggest pairing new members with active veterans
- Surface old helpful posts when relevant questions appear again
- Quietly highlight positive members (optional recognition)

### D. Creator Dashboard (Simple version for MVP)
- Live view of what the agent is doing
- List of escalated cases
- Memory insights (e.g. “Top recurring questions this week”)
- Ability to give feedback so the agent learns faster

---

## 5. Example User Scenarios 

**Scenario 1 – Repeated Question**  
New member: “How do I join the private group?”  
Agent remembers this was answered 4 times last week → Replies with the exact previous answer + link → Logs it.

**Scenario 2 – Mild Toxicity**  
Member A: “You’re so dumb for saying that”  
Agent checks history: Member A is usually positive → Soft warning + reminder of community tone → No ban.

**Scenario 3 – Spam**  
Bot posts 5 links in 10 seconds → Agent immediately removes them and mutes for 10 minutes.

**Scenario 4 – Complex Case**  
Heated argument involving personal attacks → Agent pauses, gathers full context, and escalates to human with a clear summary:  
“Here’s what happened in the last 15 messages + past history between these two members.”

**Scenario 5 – Memory Over Time**  
Day 1: Agent is cautious  
Day 7: Agent already knows the community hates self-promotion but loves meme sharing → Adjusts behavior automatically.

---

## 6. Technical Architecture (For the team)

┌─────────────────────┐
│  Platform (Discord /│
│  Telegram / YouTube)│
└──────────┬──────────┘
           │ Messages
           ▼
┌─────────────────────┐
│   Message Ingestion │
│   + Pre-processing  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Minds Persistent  │  ← Core of the project
│   Agent (Memory +   │
│   Reasoning + Act)  │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐  ┌──────────────┐
│ Actions │  │  Escalation  │
│ (Auto)  │  │  to Humans   │
└─────────┘  └──────────────┘



**Key Components we need to build:**
1. Platform connectors (start with Discord — easiest)
2. Minds agent configuration (system prompt + memory strategy)
3. Action handlers (delete, reply, mute, escalate)
4. Simple feedback loop (so the agent learns from human decisions)
5. Basic logging + simple dashboard (optional but good for demo)

---

## 7. MVP Scope for the Hackathon (What we must finish)

**Must have (for strong demo):**
- Working Discord bot connected to a Minds agent
- Persistent memory that survives restarts
- At least 3 autonomous actions (spam handling, repeated question reply, soft warning)
- Escalation to a human (Discord DM or channel)
- Clear demonstration of memory across sessions

**Nice to have:**
- Simple web dashboard
- Telegram support
- Positive member recognition

**Out of scope for this jam:**
- Multi-language advanced NLP
- Full multi-platform support
- Complex reward systems

---

## 8. How We Prove the Three Required Minds Capabilities

| Capability       | How we demonstrate it in the demo video |
|------------------|-----------------------------------------|
| Memory           | Show the agent remembering a member and past conflict from 3 days ago |
| Continuity       | Restart the agent mid-demo → it continues with full knowledge |
| Autonomous Action| Let the agent moderate live for 30–60 seconds without human input |

---

## 11. Setup Instructions (for teammates)

```bash
git clone https://github.com/your-team/context-aware-community-steward.git
cd context-aware-community-steward

# Install dependencies
npm install          # or pip install -r requirements.txt

# Configure
cp .env.example .env
# Fill in:
# - MINDS_API_KEY
# - DISCORD_BOT_TOKEN
# - etc.

# Run
npm start