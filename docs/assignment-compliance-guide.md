# CloseLoop — Eubrics Automation Engineer Assignment Guide

**Deadline:** July 26  
**Submit to:** hello@eubrics.com  
**Subject:** `Campus - Automation Engineer Assignment`

| Link | URL |
|------|-----|
| GitHub | https://github.com/pantha704/sales-bot |
| Live app | https://sales-bot-sooty.vercel.app |
| Roleplay | https://sales-bot-sooty.vercel.app/roleplay |
| Lead form | https://sales-bot-sooty.vercel.app/lead-profiler |

---

## 1. What Eubrics’ product is vs what the assignment asks

### Eubrics marketing product (eubrics.com)

Enterprise **AI sales training SaaS**:

- Industry personas (insurance, banking, B2B, contact center)
- Voice roleplay with AI customers
- Instant coaching, readiness scores, manager dashboards
- CRM / HRMS / SSO integrations
- ISO 27001 / SOC2

That is their **finished product**. You are **not** graded on cloning the whole platform.

### Campus assignment (what you must ship)

A **working slice** that proves automation thinking:

| Part | Goal |
|------|------|
| **Part 1** | Sales roleplay **voice** bot (customer, not assistant) + configs + demo video |
| **Part 2** | n8n/Make lead workflow: form → webhook → LLM category → Sheet → email + demo video |
| **Part 3** | Optional: something you automated yourself |

They evaluate **judgment, architecture, tool fluency**, and that you can **change/rebuild without AI** in the interview—not polished video skills.

---

## 2. How CloseLoop works (architecture)

```text
PART 1 — Roleplay
  Browser UI (/roleplay)
    → POST /api/roleplay/transcribe   (Groq Whisper STT)
    → POST /api/roleplay/respond      (Groq Llama buyer + persona)
    → POST /api/roleplay/speech       (free Edge neural TTS)
    → optional POST /api/roleplay/score  (coach rubric)
  Fallbacks: mock buyer (Demo mode), browser speech if Edge fails

PART 2 — Leads
  Browser form (/lead-profiler)
    → POST /api/leads  (Zod validate + rate limit + X-Webhook-Secret)
    → n8n production webhook
    → LLM classify (Organizational Development | Sales Bots)
    → Google Sheets row
    → Gmail to sales
    → JSON profile back to UI
```

### Design choices to defend in interview

| Choice | Why |
|--------|-----|
| **Turn-based voice** (not full duplex WebRTC) | Assignment allows platform *or* self-built audio. One Next.js deploy, clear control flow, lower cost. Full duplex = later LiveKit phase. |
| **Config-driven personas** | One Zod schema + one prompt builder; difficulty/objections/industry change behavior—not three hard-coded bots. |
| **Free Edge TTS** | No paid Orpheus; neural quality; browser fallback. |
| **Keys server-only** | Never `NEXT_PUBLIC_` for secrets; fail-closed n8n secret. |
| **n8n for leads** | Matches role: triggers → conditions → actions → outputs; interview may delete nodes—you rebuild by hand. |

---

## 3. Assignment compliance checklist

### Part 1 — Sales Roleplay Voice Bot

| Requirement | Status |
|-------------|--------|
| Bot roleplays as **customer** (objections, pushback) | Done |
| Live **spoken** conversation (mic + hear reply) | Done (turn-based STT/TTS) |
| Multiple configs: industry, personality, difficulty, objections | Done (Maya / Daniel / Aisha) |
| Easy to change config, not hardcoded per persona | Done |
| Voice platform **or** self-built audio | Done (self-built turn-based) |
| AI coding engine used + understood | Done (see `docs/ai-iteration-log.md`) |
| Optional: score the call | Done (strict rubric + score panel) |
| **Video** of you talking to the bot E2E | **YOU record** |
| GitHub repo | Done |

### Part 2 — Lead-Profiling Workflow

| Requirement | Status |
|-------------|--------|
| Form: details + query + **page-visit history** | Done |
| Webhook receives submission | Done |
| LLM → two categories (Org Dev / Sales Bots) | Done |
| Google Sheet write | Done |
| Email sales team | Done |
| n8n (or Make/Zapier) | Done (`workflows/lead-profiler.json`) |
| Know each node; rebuild if deleted | **YOU practice** |
| **Video** of data flow + n8n execution | **YOU record** |

### Part 3 (optional)

| Requirement | Status |
|-------------|--------|
| Personal automation story | Done (`docs/part-3-automation.md` — monday.com + Outlook) |

### Global

| Requirement | Status |
|-------------|--------|
| Clean structure + error handling | Done |
| README + `.env.example` | Done |
| Hosted URL (bonus) | Done |
| Email submission | **YOU send** |

---

## 4. How to demo / record videos

### Part 1 video (≈3–5 min, unpolished is fine)

1. Open `/roleplay`.
2. Show **three personas** (hard Maya → easy Aisha).
3. **Speak** one discovery line into the mic (or type if mic fails—prefer voice once).
4. Show **Live AI** + **Voice: edge** and hear the buyer.
5. Handle one objection on hard persona.
6. Switch persona; show behavior change.
7. **Score this call** → Back to chat.
8. Download transcript.
9. One sentence: *“Turn-based STT → LLM buyer → free Edge TTS; configs are schema-driven.”*

### Part 2 video (≈3–5 min)

1. Open `/lead-profiler`; submit **Sales Bots** sample (sales-related query + page history).
2. Open **n8n execution**; walk Webhook → classify → Sheet → Gmail.
3. Show **Sheet row** + **email**.
4. Submit **Organizational Development** sample; show different category.
5. One sentence on validation, secret header, error workflow.

---

## 5. Email template

```text
To: hello@eubrics.com
Subject: Campus - Automation Engineer Assignment

Hi Eubrics team,

Submitting my Automation Engineer campus assignment (CloseLoop).

GitHub: https://github.com/pantha704/sales-bot
Hosted app: https://sales-bot-sooty.vercel.app
- Roleplay: /roleplay
- Lead profiler: /lead-profiler

Part 1 demo video: <LINK>
Part 2 n8n execution video: <LINK>
Part 3 (optional): docs/part-3-automation.md

AI tools: AI coding assistant for implementation; I directed, reviewed, tested,
and can modify without AI. See docs/ai-iteration-log.md.
Stack notes: Groq (chat/STT), free Edge neural TTS, n8n + Google Sheets + Gmail.
See .env.example for required env vars (no secrets in repo).

Happy to rebuild n8n nodes and make live code changes in the technical round.

Thanks,
<Your name>
```

---

## 6. Technical interview prep (Step 2)

They will:

- Deep-dive **your** assignment  
- Hands-on tasks on **your** code **without AI**  
- Delete n8n nodes and ask you to **rebuild manually** (asking GPT for *steps* is OK; pasting a whole generated workflow is not the goal)

### Practice without AI

1. Add a fourth persona field or new difficulty rule.  
2. Change buyer max reply length.  
3. Reverse TTS provider order.  
4. Add one lead form field through schema → UI → n8n → Sheet.  
5. Rebuild n8n from blank: Webhook → Validate → LLM → Sheet → Email → Respond.

### One-liner architecture answers

- **Data flow:** mic/text → validate → STT (if voice) → buyer LLM → TTS → UI; score is a separate coach path.  
- **Security:** server-only keys, rate limits, webhook secret fail-closed.  
- **Automation model:** form trigger → classify action → conditions (category) → Sheet + email outputs.

---

## 7. What *not* to overclaim

- Do **not** claim continuous full-duplex phone audio (you have turn-based voice).  
- Do **not** claim parity with Eubrics enterprise (dashboards, CRM, multi-tenant LMS).  
- **Do** claim: assignment-complete roleplay + lead automation, clear tradeoffs, deployable demo, rebuildable n8n.

---

## 8. Repo map (for navigation)

```text
src/app/roleplay/              Roleplay UI
src/app/lead-profiler/         Lead form
src/app/api/roleplay/*         STT, respond, speech, score
src/app/api/leads/             n8n gateway
src/features/roleplay/         Personas, prompts, TTS, scoring
workflows/lead-profiler.json   Main n8n workflow
docs/part-1-roleplay.md
docs/part-2-n8n.md
docs/part-3-automation.md
docs/demo-checklist.md
docs/ai-iteration-log.md
```

---

## 9. Bottom line

| Area | Ready? |
|------|--------|
| Part 1 product | Yes |
| Part 2 product | Yes (reconfirm one live lead → Sheet/email before filming) |
| Part 3 write-up | Yes (optional) |
| Hosted + GitHub | Yes |
| Demo videos | **Record before submit** |
| Interview (rebuild + no-AI edits) | **Practice** |

**CloseLoop matches the campus brief.** Record two demos, send the email, and rehearse explaining + rebuilding by hand.
