# co-PI — Hackathon PRD
**BTL Runtime Hackathon · July 3–5, 2026**
Team: Justin (+ up to 3 others) · Built on the existing CRMP codebase (Next.js, Express/TS, PostgreSQL/Prisma, Socket.IO, JWT, Docker)

---

## 1. One-line pitch

**co-PI is GitHub for research, with an AI principal investigator embedded in the workflow** — not a chatbot bolted onto a dashboard, but an agent that reviews data, drafts proposals, and remembers project context across sessions, all through the BTL Runtime.

## 2. Why this scope

The rubric weights **Runtime use (30) and Usefulness (25) above Creativity (15) and Presentation (10)**. That means the winning move isn't "most features" — it's **fewer AI features, each one deeply wired into the runtime**, with a memory layer that gives BTL something to point at for the Best Use of Runtime prize. Every feature below was kept because it's (a) buildable in hours not days on your existing schema, and (b) makes the runtime call structurally necessary, not decorative.

---

## 3. In scope for the hackathon (v1)

### 3.1 Core platform (mostly already built — this is de-scoping work, not new work)
- Strip university/institution scoping from the CRMP schema and UI → rename to **repositories**
- Public/private repository visibility (you already have this as Public/Private project visibility)
- Repository page: proposal, tasks, documents, contributors, activity feed (already exists)
- Basic public discovery feed: recent + trending repositories (new, but small — one query + list view)

**Cut from core:** followers, stars/forks, profile pages, org-wide social graph. Nice-to-have, zero runtime relevance, pure UI time sink. Add only if hours 40+ are free.

### 3.2 AI features — pick exactly these four

Note on the runtime itself: BTL Runtime is an OpenAI-compatible gateway (routing, cache, dedupe, billing proof over `/v1/chat/completions` and `/v1/responses`) — it does not provide embeddings, retrieval, or agent/tool-use orchestration out of the box. Every feature below is a normal chat-completions call from co-PI's own backend; "memory," "structured extraction," and "retrieval" are things **we build on top of the gateway**, not things the gateway gives us.

**Confirmed vs. assumed capabilities** — don't build around anything in the "assumed" row until you've run Appendix A and it passes:

| Capability | Status | Evidence |
|---|---|---|
| Non-streaming `/v1/chat/completions`, standard OpenAI SDK shape | **Confirmed, working** (verified live 20:15 UTC Jul 3, after a ~50-min launch-day outage on their end from ~19:25–20:15 UTC) | Live test: `gpt-4o-mini` returns 200 with correct content and full header set |
| Model access on your key's tier: `gpt-4o-mini` + DeepSeek slugs only | **Confirmed** | `GET /v1/models` lists both families; also full GPT-4/4.1/4o/5.x catalog appears listed even if not all tiers are enabled — don't assume everything listed is usable, test before building against it |
| Multi-provider routing (OpenAI, Anthropic, Bedrock, Vertex, Together, Groq, DeepInfra, Fireworks) | **Confirmed** | Explicitly listed on the docs/homepage |
| Caching + savings proof headers (`x-btl-cache-tier`, `x-btl-saved`, `x-btl-benchmark-cost`, `x-btl-customer-charge`, `x-btl-request-id`) | **Caching itself appears real; savings headers unreliable — verified live 20:22–20:23 UTC Jul 3** | Two identical requests ~75s apart returned the **same** `id` and `created` timestamp in the response body (strong evidence of an actual cache hit, since a fresh generation gets a new id/timestamp), but `x-btl-saved`, `x-gateway-savings`, and `usage.prompt_tokens_details.cached_tokens` all stayed at 0, and `x-btl-cache-tier` never appeared at all. **Don't build a demo moment around watching these headers change — they may not, even on a real hit.** |
| Streaming (`stream: true`) | **Confirmed, working** (verified live 20:18 UTC Jul 3) | Live test: proper `text/event-stream`, incremental `delta.content` chunks, terminates with `[DONE]`. Quirk: sends a duplicate `finish_reason: "stop"` chunk 3× before `[DONE]` — make sure your SSE parser ignores repeat terminal chunks rather than assuming exactly one |
| JSON-mode / structured output (`response_format`) | **Confirmed, working** (verified live 20:19 UTC Jul 3) | Live test: `response_format: {"type": "json_object"}` accepted (200, not 400), returned clean valid JSON |
| `/v1/responses` endpoint | **Assumed, unverified** | Inferred from a secondhand source, not confirmed by reading the actual docs |

| # | Feature | What it does | Runtime call | Why it's feasible |
|---|---------|--------------|-------------------|--------------------|
| 1 | **@coPI in the proposal editor** | Mention `@coPI` in the collaborative proposal editor; it drafts/edits the section inline, streamed | `POST /v1/chat/completions` with `stream: true` — **confirmed working**, build the real streaming integration | You already have the Socket.IO collaborative editor — pipe each `delta.content` chunk into the existing channel as it arrives |
| 2 | **AI dataset review** | On CSV/dataset upload, co-PI flags missing values, duplicates, sample-size drops, obvious outliers, and posts findings as a comment on the upload | `POST /v1/chat/completions` with `response_format: {"type": "json_object"}` — **confirmed working**, use as the primary path; keep plain-text-JSON-plus-parse-and-retry only as a defensive fallback | You already have file upload + storage; a Node script computes the deterministic stats (missing values, duplicate rows, sample-size delta) and only sends the summary to the runtime for the qualitative writeup — cheap, fast, very visual in a demo |
| 3 | **AI literature digest** | On uploading 2–3 PDFs to a repository, co-PI produces a short digest: one-line summary per paper + 2–3 bullet "gaps or open questions" across all of them | `POST /v1/chat/completions` (non-streaming, no risk here) | Reuses your existing document upload; just needs PDF text extraction (`pdf-parse` or similar) piped into one prompt |
| 4 | **Project memory ("what did we decide")** | After each AI interaction, one extra call extracts 1–3 short factual statements and writes them to `AiFact`; a later `@coPI what did we decide about X` query does a keyword/recency lookup against `AiFact`, stuffs the matches into the prompt, and answers from that context instead of re-reading everything | `POST /v1/chat/completions` × 2 (non-streaming, no risk here) — app-level RAG, not a runtime feature | This is your **Best Use of Runtime** play — see §5, framing corrected below |

**Streaming fallback (contingency only — not currently needed):** streaming is confirmed working as of 20:18 UTC Jul 3, so build feature #1 with real SSE streaming. Keep this fallback in your back pocket only in case the endpoint regresses again like it did earlier today: fall back to a normal non-streaming call, get the full text back, then chunk it client-side (split on words, push into the Socket.IO channel every ~30–50ms) to fake the live-typing effect. Visually indistinguishable in a demo.

**Cut for v1, explicitly:** meeting-audio assistant, AI research planner/experiment designer, peer-review scoring, research graph/knowledge graph, collaboration matching, research feed with overlap detection. Every one of these is a legitimate product idea but needs either audio pipelines, graph UI, or a critical mass of fake data to look good in a 2-minute demo — none of that is worth the hours against a 4-feature build that's already runtime-dense.

### 3.3 Explicit roadmap slide (for the demo, not the build)
List the cut features as "what's next" in the submission description — judges see the ambition without you having built it, and it signals product thinking (helps Usefulness/Creativity scoring) at zero build cost.

### 3.4 Stretch feature (only after all four core features are done and demo-ready)

| # | Feature | What it does | Runtime call | Why it's a stretch, not core |
|---|---------|--------------|-------------------|--------------------|
| 5 | **Repository chat room with @coPI** | A persistent, per-repository discussion channel (like a Slack channel scoped to one repo) where contributors talk to each other, and can tag `@coPI` mid-conversation to get an answer grounded in that project's context — proposal content, uploaded papers, dataset findings, and prior `AiFact` entries | `POST /v1/chat/completions` with `stream: true` (same confirmed pattern as feature #1) + a retrieval step against `AiFact` before the call, same pattern as feature #4 | Real-time chat UI + presence is genuine new surface area (not just a new consumer of infrastructure you already have), and it risks diluting build hours from the four features that actually carry the rubric score. Only worth it once #1–4 are solid and demoable. |

**Why this is worth having as a stretch goal, not a cut idea:** unlike the brainstorm items already marked out-of-scope in §9 (knowledge graph, meeting assistant, etc.), this one is cheap *because* it's not new infrastructure — it reuses three things you'll already have built: the Socket.IO real-time layer (from feature #1), the confirmed streaming pattern (from feature #1), and the `AiFact` retrieval logic (from feature #4). It's essentially feature #1's mention-and-stream pattern and feature #4's memory retrieval, recombined into a standing chat surface instead of the proposal editor. If #1–4 land with time to spare, this is the single best next feature for demo impact per hour of build time.

**Scope guardrails if you attempt it:**
- Don't build threading, reactions, or read receipts — one flat, chronological message list per repository is enough.
- `@coPI` in chat should reuse the *exact same* backend call path as feature #1 (same streaming client, same system prompt scaffolding), just with a different context-assembly step (chat history + `AiFact` lookup instead of the proposal document). Don't write a second AI integration from scratch.
- If you're inside the last ~6 hours before submissions close and #1–4 aren't fully stable yet, skip this entirely — a working core beats a half-built stretch feature every time on the "complete working demo" tiebreaker.

---


## 4. Data model deltas (on top of your existing Prisma schema)

Additive only — don't touch your core CRMP tables more than necessary:

```
Repository        (rename Project; drop institution FK, keep visibility enum)
AiFact             id, repositoryId, content, sourceType (proposal|dataset|paper|chat), createdAt
AiInteraction      id, repositoryId, userId, prompt, response, endpoint, createdAt   // for demo + debugging + shows runtime usage log
DatasetReview      id, documentId, findings (jsonb), createdAt
PaperDigest        id, documentId, summary, gaps (jsonb), createdAt
```

`AiFact` is the whole memory layer. Keep it dumb on purpose: after every AI interaction, one extra runtime call ("extract 1–3 short factual statements from this exchange, or return none") writes rows here. Retrieval for v1 is keyword/recency-based, **not** vector search — don't build embeddings infra under time pressure unless hours 30+ are free and it's still stable.

**Stretch only (feature #5, §3.4) — don't create this table until #1–4 are done:**
```
ChatMessage        id, repositoryId, userId (nullable if from coPI), content, isFromAi (bool), createdAt
```
Nothing fancy — one table, no threading, no reactions. `@coPI` detection is a simple substring check on `content` before persisting, same pattern you'd use for the `@coPI` mention in the proposal editor.

---

## 5. Your two "Best Use of Runtime" stories

**Correction from earlier drafts:** RetainDB (BTL's persistent agent-memory product) is a *separate* product from Runtime, not a feature the gateway hands you — the hackathon's early-access-to-RetainDB prize implies exactly that. Runtime itself is just the OpenAI-compatible chat-completions gateway. So don't claim `AiFact` "uses RetainDB" or "uses Runtime's memory feature" — frame it accurately as **"a memory layer we built on top of Runtime, inspired by RetainDB's approach to durable agent facts."** That's honest, and it's arguably a *better* story for the Technical Execution score, since it shows you understood the gap and built something rather than assuming the gateway did it for you.

Two concrete, demoable moments to carry this:

1. **Memory layer** — ask co-PI a fact-recall question mid-demo (`@coPI what did we decide about sample size?`) and show it answer instantly from stored `AiFact` rows instead of re-reading the whole proposal. This is the "whoa" moment.
2. **Cache/dedup proof** — deliberately re-run one identical AI action in the demo (e.g. re-open the dataset review) and compare the response body's `id` and `created` fields, not the savings headers. Live testing shows the savings headers (`x-btl-saved`, `x-gateway-savings`, `x-btl-cache-tier`) don't reliably reflect a cache hit even when one demonstrably happens — but an identical `id`/`created` on the second call is hard evidence the same object was reused. **Log the raw response body in `AiInteraction`, not just headers**, so you can pull up a side-by-side diff in the demo instead of pointing at a header that might just read zero.

---

## 6. Runtime integration checklist (for the 30-point category)

- [ ] Base URL swapped to `https://api.badtheorylabs.com/v1`; scoped machine key (inference scope) created from the BTL dashboard, stored as `GATEWAY_API_KEY` env var, sent as `Authorization: Bearer $GATEWAY_API_KEY`
- [ ] Streaming used for the proposal editor (`stream: true` on `/v1/chat/completions` — visually proves it's live, not canned)
- [x] JSON-formatted output for the dataset review via `response_format: {"type": "json_object"}` — **confirmed working**, use it directly; keep a parse-validation retry as defensive fallback only, not your primary mechanism
- [ ] `AiInteraction` log table recording endpoint, request/response, and the `x-btl-request-id` / `x-btl-cache-tier` / `x-btl-saved` headers from each call — gives you a debug view to pull up live showing real request volume, endpoints used, and actual savings proof
- [ ] Deliberately trigger a cache reuse once during the demo (repeat an identical call) and show it via identical `id`/`created` in the logged response bodies — **not** via `x-btl-cache-tier`, which was confirmed not to appear even on a real hit
- [ ] Submission doc explicitly names `/v1/chat/completions` (and `/v1/responses` if used) and describes the memory layer as something co-PI built on top of Runtime, not a Runtime-native feature

---

## 7. Build timeline (mapped to hackathon schedule)

| Window | Focus |
|---|---|
| **Kickoff → +1h** (Jul 3) | Run the full capability test suite in **Appendix A** before writing any product code. This resolves the "assumed" row in §3.2 and tells you whether feature #1 needs the streaming fallback. |
| **+1h → +4h** | Get BTL key set up in the app's env. Strip institution scoping from schema/UI, rename Project→Repository. Stub discovery feed. |
| **+4h → +14h** | Build the runtime client wrapper + `AiInteraction` logging. Ship feature #1 (@coPI in proposal editor) end-to-end, including streaming into Socket.IO. |
| **+14h → +22h** | Ship feature #4 (memory layer: `AiFact` extraction + retrieval). This is your differentiator — don't skip it for polish elsewhere. |
| **Midpoint office hours** (Jul 4, 15:00 UTC) | Bring the memory layer demo specifically; ask BTL what "impressive runtime use" looks like to them. |
| **+22h → +30h** | Ship feature #2 (dataset review) and #3 (literature digest) — both are variations on the same "upload → structured runtime call → post findings" pattern, so build them back-to-back. |
| **+30h → +33h** *(only if #1–4 are fully working and demoable — see §3.4 guardrails; skip straight to theme work otherwise)* | Stretch: feature #5, repository chat room with `@coPI`. Reuse the feature #1 streaming client and feature #4 `AiFact` retrieval as-is; the only new work is the chat UI and message persistence. |
| **+33h → +38h** | Apply the Night Desk theme (§10) to the four target surfaces: landing/discovery feed, repository card, proposal editor chrome, AI streaming surface. Seed 4–5 realistic-looking public repositories in the same pass so the discovery feed doesn't look empty in the demo. Don't touch settings/auth/forms. |
| **+38h → +44h** | Record 2-minute demo video, write submission description, double-check endpoint names are accurate. |
| **+44h → 48h** | Buffer. Do not schedule real work here — assume something breaks. |

---

## 8. Demo script (2 minutes, matches submission requirement)

1. (0:00–0:15) One-line pitch on screen: "GitHub for research, with an AI co-investigator."
2. (0:15–0:35) Open a repository, show `@coPI` drafting a proposal section live, streamed.
3. (0:35–0:55) Upload a CSV → co-PI flags a data quality issue in seconds.
4. (0:55–1:15) Upload 2 short papers → co-PI's digest + gap bullets appear.
5. (1:15–1:35) Ask `@coPI what did we decide about [X]` from earlier in the demo → instant, memory-backed answer. **Linger on this.**
6. (1:35–1:50) Re-trigger the dataset review from step 3 → pull up the logged request/response pair, point at the identical `id`/`created` values from the earlier call as proof the same result was reused rather than regenerated. Shows you understand what Runtime is actually for, and that you tested rather than assumed the proof headers work as documented.
7. (1:50–2:00) Close: "Built on BTL Runtime — with a memory layer we built on top of it, and real cache-based savings you just watched happen."

**If feature #5 (chat room) got built:** don't extend the core 2-minute script — the submission requirement is a 2-minute demo, and a working core beats a padded one. Instead, mention it as a closing line before step 7 ("...and if you want to keep talking to co-PI outside the proposal, there's a project chat room too") and, if you want, record a separate 30–60s bonus clip showing it, submitted alongside but not instead of the required 2-minute video.

---

## 9. Explicitly out of scope (say so in the submission, don't apologize for it)

Meeting assistant, research/knowledge graph, collaboration matching, peer-review scoring, research feed with overlap detection, followers/stars/forks. These are real product directions, listed as roadmap in the submission — not attempted in the build.

---

## 10. Visual design direction — "Night Desk"

**Do you need to change the UI?** Yes, but not a full redesign — the current "parchment and ink" academic look actively undercuts the pivot from institutional CRMP to an open, GitHub-style research platform. But with the build hours already committed in §7, treat this as a **targeted re-skin of four surfaces**, not a rebuild: the landing/discovery feed, the repository card, the proposal editor chrome, and the AI streaming/chat surface. Everything else (settings, forms, auth) can stay on the existing component styling — judges see the demo path, not every screen.

### The concept
Not a generic dark-mode toggle. The reference point is a **research desk at 2am** — not the glow of a monitor, but the glow of the instruments and lamps on the desk itself: a gooseneck lamp over an index card, a patinated brass fitting, a corkboard with pinned evidence and thread connecting related notes. This keeps continuity with the existing "parchment and ink" identity (ink and paper are still present) while inverting it into something that reads as a working lab at night rather than a lecture hall by day. It also gives you a natural, literal way to visualize the memory layer from §5 — an `AiFact` pinned to a card with a thread line back to its source isn't just a metaphor, it's the actual UI for feature #4.

Explicitly avoided: the near-black-plus-acid-green "AI tool" look, the warm-cream-plus-terracotta "AI landing page" look, and glow/blur/neon effects — all read as templated rather than considered.

### Color tokens
| Name | Hex | Role |
|---|---|---|
| Slate board | `#14181A` | Primary background — near-black with a cool blue-green undertone (blackboard, not tech-black) |
| Corkboard | `#2B211A` | Secondary panel background — warm dark brown for cards, sidebars, code blocks |
| Chalk | `#E8E3D8` | Primary text and pinned-note surfaces — warm off-white, legible against slate |
| Brass glow | `#C98A3E` | Primary accent — human/analog actions: buttons, active states, your own edits |
| Verdigris | `#5B8C7B` | Secondary accent — reserved specifically for co-PI/AI presence: streaming text, AI facts, the co-PI avatar. Keeping this distinct from brass lets color alone tell a user "did a person or the AI do this" |
| Redline | `#B4483C` | Alerts and flagged issues only — the dataset-review "problem found" state, used sparingly |

### Typography
- **Display** (repository names, section headers): a slab serif with visible ink-trap detailing — something in the character of an old research report or proposal cover page. Set large, used sparingly.
- **Body**: a warmed grotesque sans, not a clinical/neutral one — keeps long-form proposal reading comfortable against a dark background.
- **Mono** (AI streaming text, code, dataset stats): an actual monospace, styled to evoke a teleprinter/typewriter rather than a modern code editor — this is where the streaming feature #1 physically performs the theme: text should feel like it's being typed onto the page, not rendered.

### Layout concept — the corkboard
The repository page is a corkboard, not a dashboard. The proposal is a pinned index card (see the mockup above: chalk-colored, slightly rotated, pinned). Each `AiFact` from the memory layer is a smaller card in verdigris, connected to its source with a thin dashed thread line — literally showing where co-PI's memory came from, which doubles as a transparency/trust device (the person can trace any AI claim back to its origin). Dataset review findings and paper digests use the same pinned-card language so the whole repository reads as one evidence board rather than a form-heavy CRUD app.

### Signature element
The **thread line** connecting an `AiFact` card to its source card is the one thing this page should be remembered by — it's cheap to build (a single SVG dashed line between two DOM positions), it's unique to this product, and it's not decorative: it visualizes the actual memory-retrieval mechanism from §5, so it's honest about what the AI is doing rather than just looking clever.

### Motion — restraint
Keep it to one deliberate moment: the streaming text in feature #1 typing on, character by character, like ink appearing under a pen. Don't add hover glows, card-lift shadows, or ambient animation elsewhere — those are exactly the tells that make a UI look AI-generated rather than designed.

---

## Appendix A: Quick capability test guide (run this first, before any product code)


Goal: resolve every "assumed, unverified" row in §3.2 in under 30 minutes, using `curl` so no app code is in the way. Get your key from the BTL dashboard and export it first:

```bash
export GATEWAY_API_KEY="your_key_here"
echo $GATEWAY_API_KEY   # confirm it actually printed before running anything else
```

**Model availability note:** the free/hackathon tier only accepts `gpt-4o-mini` and DeepSeek model slugs — other models (e.g. `gpt-4.1-mini`, which caused the first failed test) return a `gateway_internal_error` (500) rather than a clean "model not found" error. Run `GET /v1/models` first if unsure which exact DeepSeek slug is enabled, and use `gpt-4o-mini` for every test below.

**Known launch-day incident (Jul 3, ~19:25–20:15 UTC):** `/v1/chat/completions` returned a 500 `gateway_internal_error` for every model, regardless of slug — confirmed systemic (same `x-hikari-trace` value across `gpt-4o-mini`, `gpt-4.1-mini`, and `deepseek-chat-v3`), not a request issue. BTL pushed a fix and it's confirmed working again as of 20:15 UTC. **If Test 1 fails for anyone else on the team, check the Discord for a status update before assuming it's your setup** — this exact failure mode already happened once.

**Actual proof headers observed (slightly different from the docs example):** live responses include *both* `x-btl-benchmark-cost` / `x-btl-customer-charge` / `x-btl-saved` **and** a parallel `x-gateway-cost` / `x-gateway-fee-pct` / `x-gateway-savings` / `x-gateway-savings-pct` set. Log all of them in `AiInteraction` (§4) rather than picking one — cheap to store, and it's not yet clear which set is the "canonical" one for judging purposes.

### Test 1 — Basic call works at all
```bash
curl -i https://api.badtheorylabs.com/v1/chat/completions \
  -H "Authorization: Bearer $GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role":"user","content":"Reply with exactly the word: PASS"}]
  }'
```
**Pass:** HTTP 200, `choices[0].message.content` contains "PASS", response has `x-btl-request-id` header.
**If it fails:** check the key is an inference-scoped machine key, not a dashboard login token.

### Test 2 — Streaming (resolves the biggest unknown)
```bash
curl -i https://api.badtheorylabs.com/v1/chat/completions \
  -H "Authorization: Bearer $GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role":"user","content":"Count from 1 to 10, one number per line"}],
    "stream": true
  }'
```
**Pass:** response comes back as `data: {...}` SSE chunks with a `delta` field, arriving progressively rather than all at once (you'll visually see curl print output in bursts, not a single blob).
**Fail signs:** a normal single JSON blob back despite `stream: true` (means it's ignored — silently falls back to non-streaming, which is actually fine, just note it and use the fallback plan), a 400 error (means the param isn't accepted), or a hang/timeout.
**Action:** if it passes, build feature #1 with real streaming. If it doesn't, use the client-side chunking fallback from §3.2 and don't revisit this.

**Confirmed result (20:18 UTC Jul 3):** streaming works — clean `text/event-stream`, incremental `delta.content` per chunk, terminates with `[DONE]`. One quirk to code around: the final `finish_reason: "stop"` chunk is sent 3 times before `[DONE]` instead of once — write your SSE handler to be idempotent on the terminal event rather than assuming it fires exactly once.

### Test 3 — JSON-mode / structured output
```bash
curl -i https://api.badtheorylabs.com/v1/chat/completions \
  -H "Authorization: Bearer $GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role":"user","content":"Return valid JSON only: {\"status\": \"ok\"}"}],
    "response_format": {"type": "json_object"}
  }'
```
**Pass:** 200 with clean JSON content and no complaint about `response_format`.
**Fail:** 400 error mentioning an unrecognized param, or the param is silently ignored (content isn't guaranteed JSON).
**Action either way:** feature #2 already plans for this — prompt for JSON in plain text and validate/re-prompt on parse failure. This test just tells you whether you get a free assist or need the guardrail from day one. Don't build a dependency on `response_format` working.

### Test 4 — Caching / savings proof (your demo moment in §5 and §8)
Run **the exact same request** (identical model, messages, and any params, byte-for-byte) twice in a row:
```bash
curl -i https://api.badtheorylabs.com/v1/chat/completions \
  -H "Authorization: Bearer $GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Test cache: what is 2+2?"}]}'
# run it again immediately, identical body
```
**Pass:** second response's `x-btl-cache-tier` header shows a cache hit (e.g. `exact_response_cache`) and `x-btl-saved` is non-zero; first call likely shows a miss/direct-provider tier.
**Action:** if confirmed, this is your safest demo beat — it's the one feature category BTL's own docs show working end-to-end with real numbers, so lead with it if anything else is shaky on demo day.

**Confirmed result (20:22–20:23 UTC Jul 3):** the savings headers did NOT behave as documented — `x-btl-saved`, `x-gateway-savings` stayed at `0` on the repeat call, `x-btl-cache-tier` never appeared, and `usage.prompt_tokens_details.cached_tokens` stayed `0`. **However**, the response body's `id` and `created` fields were byte-for-byte identical across both calls despite being ~75 seconds apart — a fresh generation would get a new id and a `created` timestamp matching the actual request time, so this is strong indirect evidence the cache genuinely fired even though the proof headers didn't report it. **Do not rely on the savings headers for your demo.** Log full response bodies (not just headers) in `AiInteraction` and use identical `id`/`created` as your cache-hit evidence instead — see the corrected demo script in §8.

### Test 5 — Multi-provider routing
```bash
curl -s https://api.badtheorylabs.com/v1/models \
  -H "Authorization: Bearer $GATEWAY_API_KEY" | head -c 2000
```
**Pass:** returns a model list spanning multiple providers (look for both OpenAI-style and Anthropic-style model names).
**Then:** make one `/v1/chat/completions` call with an OpenAI model slug and one with an Anthropic model slug from that list, confirm both return 200. This is low-risk (explicitly documented) but worth a 2-minute check so you know exact working model slugs before the hackathon, not during the demo.

### Test 6 — `/v1/responses` (only if you plan to use it)
```bash
curl -i https://api.badtheorylabs.com/v1/responses \
  -H "Authorization: Bearer $GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","input":"Reply with exactly the word: PASS"}'
```
**Pass:** 200 with a response body.
**Fail:** 404/405 — means this endpoint doesn't exist on Runtime yet. If it fails, just don't mention `/v1/responses` anywhere in your submission or demo; stick to `/v1/chat/completions`, which is confirmed.

### After the 30 minutes
Update the confirmed/assumed table in §3.2 with real pass/fail results, and adjust feature #1's streaming plan accordingly before anyone starts writing the editor integration. This is the single highest-leverage 30 minutes of the entire hackathon — it prevents building a feature around a capability that silently doesn't exist.