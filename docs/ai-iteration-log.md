# AI Direction and Iteration Log

AI coding engine used: **OpenAI Codex**.

The assignment permits “Claude Code or similar engine.” This log is an honest
summary of how Codex was directed and how its output was checked; Claude Code
was not used.

| Checkpoint | Direction | Verification and correction |
|---|---|---|
| Repository baseline | Inspect the empty public repository and establish small, committed phases | Confirmed default branch and write access before coding |
| Foundation | Create a single Next.js/TypeScript app that runs without keys | Lint, type-check, production build, local commit |
| Conversation engine | Define validated persona configuration and one reusable buyer prompt | Unit-tested schema, prompt constraints, and deterministic buyer |
| Voice integration | Add Groq STT/LLM, Neuphonic TTS, Groq and browser fallbacks | Fixed the test environment’s `server-only` resolution; 15 tests and build passed |
| Roleplay UI | Add microphone/typed turns, buyer status, transcript, and controls | Found and corrected a stale-state guard that could block a newly transcribed turn; runtime POST smoke-tested |
| Lead workflow | Match the assignment’s exact fields and two category names | Re-read the source brief, added boundary validation, mock transparency, workflow JSON, and error workflow |
| Final QA | Run every automated check and inspect repository secrets/placeholders | 21 tests, lint, type-check, production build, JSON validation, runtime smoke tests, secret scan, and zero-vulnerability production audit passed |

## How changes were controlled

- Work was split into independently testable phases and committed after each
  green checkpoint.
- Provider output is never trusted without validation.
- Generated code was read and revised; failed checks were treated as evidence,
  not bypassed.
- Mock behavior is clearly labelled rather than pretending an external system
  succeeded.
- Secrets, real employer data, and live customer information were never added
  to the repository.

## Changes I can explain or make live

- Add a persona or a new difficulty rule.
- Change the buyer’s response length and behavior constraints.
- Reverse the TTS provider priority.
- Add an allowed audio type or adjust the size limit.
- Add a lead form field through its schema, UI, n8n validation, Sheet mapping,
  and email.
- Rebuild each n8n node from its input and output contract.
- Replace Google Sheets with a database and explain the idempotency benefit.
