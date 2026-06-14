# PASS426 — Angel Provider Gateway

Scope: bugfix + AI brain only.

## Implemented

- Added `lib/market-integrity/pass426-angel-provider-gateway.ts`.
- Added server route `app/api/market-integrity/angel/route.ts`.
- Extended `app/api/market-integrity/chat/route.ts` with `angel`, `pass426`, and `brain` payloads.
- Angel is a Velmère-owned persona layer, not a public ChatGPT/Gemini label.
- Default mode is `sealed_local`: deterministic source-bound answer with no external key.
- Optional mode supports local/open OpenAI-compatible endpoints through server-only env vars:
  - `VELMERE_ANGEL_PROVIDER=local`
  - `VELMERE_ANGEL_BASE_URL=http://127.0.0.1:1234/v1`
  - `VELMERE_ANGEL_MODEL=<local-model-name>`
  - `VELMERE_ANGEL_API_KEY=<server-only-if-needed>`
- No API key is placed in client/browser/mobile code.
- The model receives compact risk payload only: score, confidence, sources, missing data, memory mode, evidence and allowed next actions.
- Hallucination output is sanitized; banned claims fall back to deterministic Angel answer.

## Product rule

Angel may feel alive because it remembers market-risk history, reads source state, adapts wording and answers questions. It must not claim sentience, hidden certainty, guaranteed price direction or investment instructions.

## Validation

- `npm run verify:pass426-angel-provider-gateway`
- `npm run verify:pass425-source-arbitration-hallucination-brake`
- `npm run check:i18n`
- `npm run vercel:preflight`
