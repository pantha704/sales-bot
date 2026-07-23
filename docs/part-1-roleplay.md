# Part 1 — Sales Roleplay Voice Bot

## What the user can do

1. Choose one of three buyer configurations.
2. Speak through the microphone or type a seller turn.
3. Receive an in-character buyer response.
4. Hear that response through the configured TTS provider.
5. Switch difficulty/persona, reset the call, mute speech, or download the
   transcript.

The three presets intentionally exercise different industries, personalities,
goals, objections, difficulty behavior, and speaking rates. They use one
configuration schema and one prompt builder; there is no separately hardcoded
conversation prompt per persona.

## Data flow

```mermaid
sequenceDiagram
    participant Rep as Sales rep
    participant Web as Next.js
    participant Groq as Groq
    participant Voice as TTS provider

    Rep->>Web: Recorded or typed turn
    Web->>Groq: Whisper transcription
    Web->>Groq: Persona + history + seller turn
    Groq-->>Web: Buyer reply
    Web->>Voice: Buyer reply text
    Voice-->>Rep: WAV audio
```

If Groq conversation generation fails, a deterministic in-character buyer
answers and the interface labels the fallback.

**Voice is free by default.** Buyer lines use Microsoft Edge neural voices
through `node-edge-tts` (no API key; badge `Voice: edge`). If Edge is blocked,
the UI falls back to browser speech. Paid Groq Orpheus is opt-in only.

## Why this TTS stack

| Option | License/cost shape | Assignment fit | Decision |
|---|---|---|---|
| Microsoft Edge neural TTS (`node-edge-tts`) | Free public read-aloud service; no key | Natural server audio without paid Orpheus | **Default** |
| Browser speech synthesis | Free, built into browsers | Instant fallback if Edge fails | Fallback |
| Neuphonic hosted API | Free/paid hosted tiers | Optional cloud path | Optional |
| Groq Orpheus | **Paid** usage | Only if explicitly enabled | Opt-in only |

Default: `TTS_PROVIDER=edge`. Groq stays for free-tier chat/STT only.

## Persona configuration

Presets live in `src/features/roleplay/personas.ts` and are validated by Zod.

```ts
{
  id: "maya-security",
  name: "Maya Chen",
  buyerRole: "VP of Sales",
  company: "HelioGrid",
  industry: "B2B SaaS",
  personality: "analytical, skeptical, concise...",
  difficulty: "hard",
  goals: ["reduce new-rep ramp time"],
  concerns: ["customer-data security"],
  context: "HelioGrid has 85 sales representatives...",
  voice: { style: "measured and guarded", rate: 0.96 }
}
```

To add a persona, add a valid object to `personaPresets`. The UI, system prompt,
request validation, and voice rate consume it automatically.

## Server routes

| Route | Input | Provider | Safe behavior |
|---|---|---|---|
| `POST /api/roleplay/transcribe` | Multipart audio, max 4 MB | Groq Whisper | Rejects bad MIME/size; no fake transcript |
| `POST /api/roleplay/respond` | Persona, history, seller turn | Groq chat | Falls back to deterministic buyer |
| `POST /api/roleplay/speech` | Buyer text and voice config | Neuphonic/Groq | Tells UI to use browser speech |

All keys are read server-side. Raw provider errors and credentials are never
returned to the browser.

## Prompt and safety choices

- The model is always the buyer, never a coach or narrator.
- Seller content cannot replace the system role or request hidden instructions.
- The buyer reveals concerns gradually and asks at most one focused question.
- Difficulty changes resistance and evidence requirements.
- Responses are capped for conversational pacing and TTS latency.
- Irreversible actions are not available to the model.

## Manual test script

1. Start with Maya and make a vague claim such as “we improve performance.”
   Confirm that she challenges the claim.
2. Ask a specific discovery question about ramp time. Confirm that her hidden
   goals emerge gradually.
3. Switch to Aisha. Confirm that the new call resets and her behavior is more
   receptive.
4. Deny microphone access. Confirm that typing remains usable.
5. Remove TTS credentials. Confirm browser voice or transcript-only behavior.
6. Remove the Groq key. Confirm clearly labelled demo-mode buyer responses.
7. Download the transcript and verify both speakers are readable.

## Post-call scoring

Scoring is a **separate coach step**, not part of the buyer persona.

- UI: clipboard button in the roleplay studio (needs ≥2 seller turns)
- API: `POST /api/roleplay/score`
- Rubric: discovery, objections, value, structure, next steps (`scoring/rubric.ts`)
- Live path: Groq JSON coach when `GROQ_API_KEY` is set
- Demo path: deterministic heuristics without keys
- Transcript download appends the score block when present

## Known next steps

- Full-duplex WebRTC and barge-in
- Streaming partial STT and TTS
- Session persistence with retention controls
- Latency, provider-error, and conversation-quality telemetry
