# CloseLoop — Production Deployment Readiness Plan

Status date: 2026-07-24  
Target host: **Vercel** (Next.js 16 App Router)  
Repo: `https://github.com/pantha704/sales-bot`

This plan is scoped to what is true in the current codebase. Items marked
**Done** are already implemented. Items marked **P0–P3** are ordered by
risk for a public production URL.

---

## 1. Current baseline (accurate as of this doc)

| Capability | State in repo |
|------------|----------------|
| Next.js app with roleplay + lead profiler UI | Present |
| Zod validation on conversation + lead payloads | Present |
| Server-only env parsing (`src/lib/env.ts`) | Present |
| Demo mode without keys (mock buyer / local lead profiler) | Present |
| Live path: Groq chat + Whisper + Neuphonic/Groq TTS | Present |
| n8n gateway with optional `X-Webhook-Secret` | Present |
| Audio upload size cap (4 MB) on transcribe | Present |
| Safe provider error messages | Present |
| Vitest unit/route tests + GitHub Actions CI | Present |
| Auth / sessions / multi-tenant | **Absent** |
| Rate limiting / spend caps | **Absent** |
| Security headers in `next.config` | **P0 (added for deploy)** |
| Structured observability (Sentry, etc.) | **Absent** |
| Durable lead storage in-app | **Absent** (n8n → Sheets) |
| Session / transcript persistence | **Absent** (browser-only) |

**Implication:** The app can be **hosted** on Vercel immediately and will serve
the UI + APIs. Without keys it runs in **Demo mode**. With keys it is **live
but still missing abuse protection and ops**, so treat public traffic as a
cost and abuse risk until P0 security is finished.

---

## 2. Production definition of done

CloseLoop is **production deployment ready** when all of the following hold:

1. **Hosted** on Vercel production with a stable URL.
2. **Config** for production is explicit (live vs demo behavior is intentional).
3. **Secrets** never ship in the client or git; only Vercel env / n8n credentials.
4. **Abuse** of paid APIs is bounded (rate limits + optional auth).
5. **Lead pipeline** cannot report success when nothing was saved.
6. **Failures** are visible (logs/alerts) and user-facing messages stay safe.
7. **CI** blocks broken `main`; production deploys from `main`.
8. **Privacy** for leads/transcripts is documented and retention is controlled.

---

## 3. Architecture on Vercel

```text
Browser (UI)
  │
  ├─ POST /api/roleplay/transcribe  → Groq Whisper
  ├─ POST /api/roleplay/respond     → Groq Llama (or mock)
  ├─ POST /api/roleplay/speech      → Neuphonic / Groq TTS
  ├─ POST /api/leads                → n8n production webhook
  └─ GET  /api/health               → uptime probe

n8n Cloud
  → classify (Groq) → Google Sheets → Gmail
  → error workflow on failure
```

| Concern | Vercel mapping |
|---------|----------------|
| Framework | Auto-detected Next.js |
| Runtime | Node.js for API routes (`export const runtime = "nodejs"`) |
| Env | Project → Settings → Environment Variables (Production + Preview) |
| Git deploys | Connect GitHub `pantha704/sales-bot`, production branch `main` |
| Regions | Default is fine for demo; pin closer to users later |
| Fluid/serverless | Stateless routes only — no in-memory rate limit is reliable alone |

---

## 4. Environment matrix

### 4.1 Variables (from `.env.example`)

| Variable | Required for demo host | Required for live AI | Required for live leads | Notes |
|----------|------------------------|----------------------|-------------------------|--------|
| `GROQ_API_KEY` | No | **Yes** | If n8n classifier uses Groq | Server-only |
| `GROQ_CHAT_MODEL` | No | Recommended | — | Default `llama-3.3-70b-versatile` |
| `GROQ_TTS_VOICE` | No | If Groq TTS | — | Default `troy` |
| `NEUPHONIC_API_KEY` | No | For primary TTS | — | Server-only |
| `NEUPHONIC_VOICE_ID` | No | With Neuphonic | — | |
| `TTS_PROVIDER` | No | Recommended | — | `neuphonic` \| `groq` |
| `N8N_LEAD_WEBHOOK_URL` | No | — | **Yes** (production URL) | Not the n8n *test* URL |
| `N8N_WEBHOOK_SECRET` | No | — | **Yes in prod** | Must match n8n Header Auth |

### 4.2 Production policy (recommended)

| Rule | Rationale |
|------|-----------|
| Set secrets on **Production** and **Preview** separately | Avoid prod webhook spam from PR previews |
| Prefer **no** n8n URL on Preview | Preview deploys should not write real Sheets/emails |
| Never use `NEXT_PUBLIC_` for any of the above | Keys would leak to the browser |
| Make webhook secret **mandatory** when webhook URL is set | Prevents open proxy to n8n |
| Document whether prod allows mock fallback | Silent mock buyer can mislead users |

### 4.3 Local development

```bash
cp .env.example .env.local
# fill keys as needed
npm install
npm run dev
```

---

## 5. Phased work plan

### Phase A — Deploy baseline (hosting) — **this session**

| ID | Task | Acceptance criteria | Status |
|----|------|---------------------|--------|
| A1 | Production readiness doc | This file in `docs/` | Done when committed |
| A2 | Security headers on Vercel responses | CSP-friendly defaults, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`, `Permissions-Policy` | Implement |
| A3 | Vercel project link + production deploy | Public HTTPS URL returns app shell | Implement |
| A4 | GitHub repo already has source | `main` on origin matches deploy | Done (`1943cd5`+) |
| A5 | Post-deploy: open site, hit `/api/health` | 200 JSON health | Manual after deploy |
| A6 | Document env configuration steps for live mode | Section 8 below | Done |

**Outcome of Phase A:** App is publicly reachable. Live AI/leads still need keys.

---

### Phase B — Production config (live integrations) — **owner: you + keys**

| ID | Task | Acceptance criteria |
|----|------|---------------------|
| B1 | Add `GROQ_API_KEY` (and model/voice) in Vercel Production | Roleplay shows **Live AI**, not Demo |
| B2 | Add Neuphonic or set `TTS_PROVIDER=groq` | Speech route returns audio; browser fallback only on failure |
| B3 | Import + **publish** n8n workflows from `workflows/` | Production webhook URL exists |
| B4 | Set `N8N_LEAD_WEBHOOK_URL` + `N8N_WEBHOOK_SECRET` on Vercel Production only | Lead form returns `mode: "live"` |
| B5 | Wire Google Sheet + Gmail credentials in n8n | One Sales + one OD sample each produce row + email |
| B6 | Redeploy or wait for env propagation | New deployment after env changes |
| B7 | Smoke: mic → STT → reply → TTS; lead submit | End-to-end on production URL |

**Outcome of Phase B:** Feature-complete live demo suitable for assignment reviewers.

---

### Phase C — P0 security & cost control — **before open traffic**

| ID | Task | Acceptance criteria | Implementation notes |
|----|------|---------------------|----------------------|
| C1 | Rate limit `/api/roleplay/*` and `/api/leads` | Burst + sustained limits per IP | Prefer **Upstash Redis** `@upstash/ratelimit` (serverless-safe). In-memory maps are **not** reliable on Vercel. |
| C2 | Require `N8N_WEBHOOK_SECRET` when URL set | Boot or request fails closed | Tighten `src/lib/env.ts` + leads route |
| C3 | Production mock policy | Either fail closed without keys, or banner “Demo mode” always visible | Product decision |
| C4 | JSON body size limits | Reject oversized conversation histories | Cap messages array length (schema already partial) |
| C5 | CAPTCHA or light auth on public lead form | Blocks trivial bot spam | Turnstile / hCaptcha |
| C6 | Spend alerts on Groq + Neuphonic dashboards | Alert before budget blowout | External dashboards |
| C7 | Secret scanning in CI | gitleaks or GitHub secret scanning | CI job |

**Outcome of Phase C:** Safe enough for a public marketing/demo URL with live keys.

---

### Phase D — Observability & reliability — **week 1 of real use**

| ID | Task | Acceptance criteria |
|----|------|---------------------|
| D1 | Error tracking (Sentry or equivalent) | Server + client errors with release tags |
| D2 | Structured request logs + `requestId` | Correlate 502s without logging audio/PII |
| D3 | Uptime monitor on `/api/health` | Alert within 5 minutes of outage |
| D4 | Metrics: latency, fallback rate, lead 502 rate | Dashboard |
| D5 | Lead idempotency key | Retries do not double-write Sheets/email |
| D6 | n8n error workflow verified in prod | Controlled failure produces dead-letter path |
| D7 | Circuit breaker for provider outages | Stop hammering failing TTS/LLM |

---

### Phase E — Product / compliance hardening — **if real customers**

| ID | Task | Acceptance criteria |
|----|------|---------------------|
| E1 | Authentication (Clerk/Auth.js/etc.) | Only intended users burn STT/LLM |
| E2 | Session persistence + retention TTL | Resume practice; auto-delete |
| E3 | Privacy policy + mic consent copy | Legal minimum for recording |
| E4 | Data export/delete for lead PII | Sheets process or app-owned DB |
| E5 | E2E tests (Playwright) against preview | CI smoke on critical paths |
| E6 | Streaming STT/TTS, barge-in | Latency product bar |
| E7 | Post-call scoring rubric | Differentiated product value |
| E8 | Multi-region / SLA only if needed | Cost vs benefit |

---

## 6. Security checklist (deploy surface)

| Control | Phase | Notes |
|---------|-------|-------|
| No secrets in client bundle | A | Enforced by server-only env module |
| HTTPS | A | Vercel default |
| Security headers | A | `next.config.ts` |
| Open API cost abuse | C | Rate limits mandatory with live keys |
| Webhook auth | B/C | Header secret required in prod |
| Prompt/injection noise | C/E | Buyer system prompt + output caps already slice to 500 chars |
| PII in logs | D | Never log full lead body or audio |
| Dependency vulns | C | `npm audit` in CI optional gate |

---

## 7. Verification gates

### 7.1 Before every production deploy

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

CI already runs these on `main` / PRs (`.github/workflows/ci.yml`).

### 7.2 Post-deploy smoke (manual)

| Step | Expected |
|------|----------|
| Open `/` | CloseLoop landing |
| Open `/roleplay` | Studio loads; mode badge Demo or Live |
| Type a pitch (no mic) | Buyer reply; transcript updates |
| Download transcript | Local file, both speakers |
| Open `/lead-profiler` | Form validates |
| Submit sample lead | `mock` without n8n; `live` with n8n |
| `GET /api/health` | Healthy JSON |
| Kill n8n URL temporarily | Lead API 502; no “saved” claim |

### 7.3 Live AI smoke (after B1–B2)

| Step | Expected |
|------|----------|
| Mic record short clip | Transcription text |
| Buyer reply | `mode: "live"` |
| TTS | Audio plays; header `X-TTS-Provider` set |

---

## 8. Vercel operator runbook

### 8.1 First-time link + deploy (CLI)

```bash
# authenticated as your Vercel user
cd /path/to/sales-bot
vercel link --yes --project sales-bot
vercel deploy --prod --yes
```

Prefer connecting the GitHub repo in the Vercel dashboard so every push to
`main` deploys production automatically.

### 8.2 Set production env vars

Dashboard: **Project → Settings → Environment Variables → Production**

Or CLI (example pattern; do not put real secrets in shell history if avoidable):

```bash
printf '%s' 'YOUR_KEY' | vercel env add GROQ_API_KEY production
# repeat for each var
vercel deploy --prod --yes   # redeploy to pick up env
```

### 8.3 After env changes

Vercel does **not** always hot-reload production functions with new secrets
until a new deployment. Redeploy after changing Production env.

### 8.4 Rollback

Vercel dashboard → Deployments → previous successful deployment → **Promote to Production**.

### 8.5 Incident: cost spike

1. Remove or rotate `GROQ_API_KEY` / Neuphonic keys in Vercel.
2. Redeploy or instant env update + redeploy.
3. App falls back to Demo mode for chat (leads fail closed if n8n removed).
4. Add rate limits (Phase C) before restoring keys.

---

## 9. What “done” looks like by audience

| Audience | Minimum phases |
|----------|----------------|
| Assignment reviewer | A + B + demo checklist in `docs/demo-checklist.md` |
| Public demo with live AI | A + B + **C** |
| Real sales team / real leads | A–E as applicable |

---

## 10. Explicit non-goals (for now)

- Full-duplex WebRTC voice
- In-app CRM replacing Sheets
- Multi-tenant enterprise SSO
- Self-hosted n8n (documented as future option in README)

These are product expansions, not deploy blockers for a single-tenant demo.

---

## 11. Execution tracker

| Phase | Goal | Blocking for public live keys? |
|-------|------|--------------------------------|
| A | Host on Vercel + headers + docs | No (demo mode OK) |
| B | Wire Groq / TTS / n8n | Needed for live features |
| C | Rate limits + secret policy | **Yes** |
| D | Observability + lead reliability | Strongly recommended |
| E | Auth, compliance, E2E product | If real users/PII at scale |

---

## 12. Session actions log

| When | Action |
|------|--------|
| 2026-07-24 | Plan written; security headers; Vercel production deploy initiated |
