# CloseLoop demo video scripts (Parts 1 & 2)

Use the **live app**: https://sales-bot-sooty.vercel.app  
Repo (mention once per video if useful): https://github.com/pantha704/sales-bot

**Before any recording**

- [ ] Incognito or clean browser profile (no personal tabs/bookmarks)
- [ ] Hide passwords, tokens, n8n credentials, personal inbox
- [ ] Mic permission allowed; speakers/headphones on
- [ ] Part 1: try one full roleplay turn so voice works
- [ ] Part 2: if claiming live automation — n8n published, Sheet open in a second window, test Gmail tab ready
- [ ] If Part 2 is demo-only — be honest: “Demo mode classifies locally; n8n export is in the repo”

**Recording tips**

- 1080p, browser zoom ~100–110%
- Speak slower than normal; pause after clicks
- Don’t show `.env` or secrets
- Target **3–5 minutes** per video

---

# Video 1 — Part 1: Sales roleplay voice bot

**Length:** ~4 minutes  
**URL to open first:** https://sales-bot-sooty.vercel.app  
**Then go to:** `/roleplay`

## What you’re proving

1. Configurable AI buyer (multiple personas)  
2. Talk or type as the seller  
3. Buyer answers in character + voice  
4. Transcript download  
5. Optional: call score  

---

### [0:00–0:30] Hook + context

**Show:** Home page of CloseLoop.

**Say:**

> Hi — this is Part 1 of my Eubrics Automation Engineer assignment: the **sales roleplay voice bot**.  
> Everything lives in one repo called CloseLoop. Part 1 is the roleplay studio; Part 2 is a separate lead-profiling flow on another page.  
> Live app is here — no login required. Demo mode works without keys; with Groq configured you get live STT and buyer AI. Buyer voice defaults to free Edge neural TTS.

**Do:** Click **Start a roleplay** (or open `/roleplay`).

---

### [0:30–1:00] Show configurations

**Show:** Persona / buyer picker (three buyers).

**Say:**

> Part 1 requires a **configurable** bot. I have three buyer presets — different industry, personality, goals, concerns, and difficulty.  
> Same schema and prompt builder; I’m not hardcoding a separate conversation per persona.  
> I’ll start with the harder buyer so you can see pushback.

**Do:** Select the hard buyer (e.g. Maya / security-focused VP). Point at role, company, difficulty if visible.

---

### [1:00–2:30] Live conversation (core demo)

**Say:**

> I’ll speak or type as a sales rep. The app can transcribe audio with Groq Whisper, send the turn to the buyer model, then speak the reply with free Edge TTS — or fall back to browser speech if needed.

**Do (option A — voice):**

1. Click record / mic.  
2. Say something **vague**:  
   *“Hi Maya — our platform improves sales performance for teams like yours.”*  
3. Stop recording; wait for transcript + buyer reply + audio.

**Do (option B — type if mic fails):**

Type the same line and send.

**Say (after hard buyer pushes back):**

> She’s skeptical — that’s intentional. Hard difficulty should challenge vague claims and surface concerns gradually.

**Do:** Send a **better** discovery turn, e.g.:

> *“What’s the biggest bottleneck when you onboard new reps today — ramp time, coaching bandwidth, or call quality consistency?”*

**Say:**

> Now she’s engaging on a real pain. The bot stays in character as the buyer — not a coach and not a narrator.

---

### [2:30–3:15] Switch configuration

**Do:** Switch to an easier / different persona (e.g. Aisha). Confirm call resets if that’s the UI behavior.

**Say:**

> Switching buyer config starts a different conversation. Same product, different persona rules — that proves configuration actually changes behavior, not just a label.

**Do:** One short typed turn so the new buyer answers differently.

---

### [3:15–3:45] Transcript + score

**Do:** Download / open transcript. Briefly scroll seller vs buyer lines.

**Say:**

> Transcript download is for coaching review. After at least two seller turns I can also **score the call** against a transparent rubric — discovery, objections, value, structure, next steps. Scoring is a separate coach path so the buyer model doesn’t break character mid-call.

**Do (if time):** Click score → show score card under transcript.

---

### [3:45–4:15] Close Part 1

**Say:**

> Summary for Part 1: configurable buyers, voice or text input, free neural voice by default, transcript, optional scoring.  
> Stack is Next.js on Vercel, Groq for STT and chat when keys are set, Edge TTS with browser fallback.  
> Part 2 is the lead form and n8n automation on the same app — separate video.

**Do:** Optional: navigate home and point at Lead Profiler without entering it.

**End recording.**

---

### Video 1 — if something fails (say this, don’t panic)

| Problem | Line |
|---|---|
| No mic | “Typing is fully supported — same pipeline after the text is in.” |
| No voice audio | “If cloud TTS is blocked we fall back to browser speech or transcript-only; the conversation still works.” |
| Demo mode buyer | “Without a Groq key you get labelled demo buyer replies so the UI is always demoable.” |

---

# Video 2 — Part 2: Lead profiler + n8n

**Length:** ~4–5 minutes  
**URL:** https://sales-bot-sooty.vercel.app/lead-profiler  

## What you’re proving

1. Website form for visitor + page history  
2. Classification into **exactly two** categories: **Sales Bots** / **Organizational Development**  
3. Automation path: validate → classify → **Google Sheet** → **Gmail** → response  
4. You understand the workflow (not only “import JSON”)  

**Ideal layout:** browser app | n8n execution | Sheet (and Gmail if possible)

---

### [0:00–0:35] Hook + what n8n is for

**Show:** Home → open **Lead profiler**.

**Say:**

> This is Part 2 — lead profiling and automation.  
> Same CloseLoop app as Part 1, different page.  
> Here a website visitor submits interest. The site does **not** write to Sheets or email by itself.  
> It validates the lead and posts to an **n8n** workflow.  
> n8n classifies the lead with AI, appends a Google Sheet row, emails sales, and returns the category to the UI.  
> Leads are entered on this form — not typed manually into each n8n node.

---

### [0:35–1:00] Form tour

**Show:** Form fields (name, email, company, title, query, page history / samples).

**Say:**

> The payload includes identity fields, their question, and which pages they visited — that context drives classification.  
> Categories are restricted to two assignment values: **Sales Bots** and **Organizational Development**.

**Do:** Load **Sales** sample if available (don’t invent secrets).

---

### [1:00–2:00] Submit Sales Bots lead

**Do:** Submit Sales sample. Wait for success UI (category + reason). Note **live** vs **demo**.

**If live (`mode: live` / n8n live):**

**Say:**

> The app returned **Sales Bots** with a reason. Mode is live — that means our API forwarded this to the n8n production webhook with a shared secret header.

**If demo only:**

**Say:**

> This environment is in **demo mode** — local classification so reviewers can always try the form.  
> The full automation is the export in `workflows/lead-profiler.json`. I’ll walk the node design and what happens when the webhook is connected.

---

### [2:00–3:30] Trace n8n (core of Part 2)

**Do:** Switch to n8n → open the latest execution for this submit (or open the workflow canvas if no live run).

**Say while pointing at each node:**

> **Webhook** — receives the POST from our Next.js API. Header auth with `X-Webhook-Secret` so random internet traffic can’t spam our Sheet.  
>  
> **Validate & normalize** — required fields, email shape, trim, page-history bounds. Bad data stops here — no Sheet, no email.  
>  
> **Groq classifier** — HTTP call to Groq with the query and page history. Instructed to return only one of the two allowed categories plus a short reason. We don’t send unnecessary PII like we don’t need for classification.  
>  
> **Validate model output** — parse JSON and enforce the category allowlist. If the model returns garbage, we fail before side effects.  
>  
> **Google Sheets** — append one row: lead id, contact fields, category, reason, timestamp.  
>  
> **Gmail** — notify sales with the profile so a human can follow up.  
>  
> **Respond to webhook** — JSON back to the website so the UI can show category and reason.  
>  
> There’s also an **error workflow** that alerts ops on failure with sanitized metadata — so automation doesn’t fail silently.

**Do (live):** Open Sheet → highlight the new row. Open test email if you have it.

**Say:**

> Same lead id flows through the system — form → workflow → sheet → email.

---

### [3:30–4:15] Second category (Organizational Development)

**Do:** Back to `/lead-profiler` → load Org Development sample → submit.

**Say:**

> Second required path: leadership / culture / manager-style intent should classify as **Organizational Development**, not Sales Bots.  
> Same pipeline — different category, new sheet row, second notification.

**Do:** Show second Sheet row (or second execution) if live.

---

### [4:15–4:45] Reliability (30 seconds — interview gold)

**Say (no need to break production):**

> On reliability: validation runs before side effects; model output is re-checked; retries are bounded on provider errors; wrong webhook secret is rejected before the workflow runs.  
> For higher volume you’d add lead-id uniqueness before append/email so a double-submit doesn’t duplicate.  
> I can rebuild each node from input → config → output → failure mode — import alone isn’t the point.

---

### [4:45–5:00] Close Part 2

**Say:**

> Part 2 summary: website form in CloseLoop, n8n as the automation layer — classify, store, notify, return result.  
> Repo has the workflow JSON, sheet template, and error handler for import.  
> Part 1 was practice-with-an-AI-buyer; Part 2 is inbound lead ops. Same product surface, two assignment parts.

**End recording.**

---

### Video 2 — if n8n isn’t live

Keep the form submit, then open:

1. `workflows/lead-profiler.json` in GitHub (or local editor)  
2. [docs/part-2-n8n.md](part-2-n8n.md) architecture diagram  

**Say:**

> I’m showing the exported workflow the assignment asks for. When `N8N_LEAD_WEBHOOK_URL` and secret are set on the host, this form hits that webhook end-to-end. The node design and failure modes are the same.

---

# Super-short versions (if you need &lt; 2 min each)

## Part 1 (90 seconds)

1. Home → roleplay.  
2. “Three configurable buyers.” Pick hard one.  
3. One vague pitch → pushback. One good question → engagement.  
4. Switch persona.  
5. Download transcript (+ score if quick).  
6. “Next.js, Groq, free Edge TTS. Part 2 is leads + n8n.”

## Part 2 (90 seconds)

1. Lead profiler form.  
2. “Form → API → n8n; not manual node entry.”  
3. Submit Sales sample → category on screen.  
4. n8n: webhook → validate → Groq → sheet → gmail → response.  
5. Submit Org sample.  
6. “Classify, log, notify. Error workflow for failures.”

---

# Suggested titles (Loom / YouTube unlisted)

- `CloseLoop Part 1 — Sales Roleplay Voice Bot (Eubrics)`  
- `CloseLoop Part 2 — Lead Profiler + n8n (Eubrics)`

# Email blurb after upload

```text
Part 1 (roleplay): <loom/youtube link>
Part 2 (leads + n8n): <loom/youtube link>
Live app: https://sales-bot-sooty.vercel.app
Repo: https://github.com/pantha704/sales-bot
```
