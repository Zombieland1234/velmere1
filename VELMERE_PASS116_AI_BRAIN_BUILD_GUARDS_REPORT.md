# VELMERE PASS 116 — AI Brain Build Guards + Codex Pass 2 Prompt

## Base
Built on PASS 115.

## Implemented

### 1. Dedicated risk-engine safety script
Added:
- `scripts/verify-risk-engine-safety.mjs`

Checks:
- old TokenRisk/VLM bugs do not return
- no `result.limitations`
- no direct Map/Set iterator spreads
- no browser APIs inside `risk-engine.ts`
- required exports exist
- stablecoin/RWA/confidence language exists
- unsafe hype/advice/legal-accusation language is blocked
- signal IDs used in signals are declared in `RiskSignalId`

### 2. Package scripts updated
Updated:
- `package.json`

Added:
- `verify:risk-engine`

Updated:
- `verify:shield-all` now runs `verify:risk-engine`

### 3. Vercel preflight strengthened
Updated:
- `scripts/vercel-preflight.mjs`

Added risk-engine production guard so Vercel fails early if the risk brain reintroduces old known bugs.

### 4. AI brain checklist
Added:
- `docs/launch/AI_BRAIN_BUILD_GUARD_CHECKLIST.md`

### 5. Giga prompt for Codex
Added:
- `docs/codex-handoff/CODEX_ULTRA_DEEP_AI_RISK_BRAIN_PASS2_PROMPT.md`

Also exported for user download:
- `CODEX_ULTRA_DEEP_AI_RISK_BRAIN_PASS2_PROMPT.md`

## Validation
- `node scripts/check-i18n.mjs` → exit 0
- `node scripts/vercel-preflight.mjs` → exit 0
- `node scripts/verify-market-integrity-no-truncation.mjs` → exit 0
- `node scripts/verify-shield-design-safety.mjs` → exit 0
- `node scripts/verify-risk-engine-safety.mjs` → exit 0

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX TS/JS artifacts: 0
- old TokenRisk/risk-engine bad terms: 0

## Progress note

| Area | Previous | After PASS 116 | Change |
|---|---:|---:|---:|
| UI shell / layout | 47–48% | 47–48% | 0% |
| Shield terminal | 39–41% | 40–41% | +0–1% |
| VLM AI risk brain | 30–34% | 31–35% | +1% |
| Data / API spine | 31–32% | 32–33% | +1% |
| Legal / launch safety | 47–49% | 49–51% | +2% |
| Mobile polish | 25–26% | 25–26% | 0% |
| Full translations | 35–36% | 35–36% | 0% |
| Clothing commerce readiness | 47–50% | 47–50% | 0% |
| Whole brand/site launch readiness | 41–43% | 42–44% | +1% |

## Remaining blockers
- Full Vercel/Next build needs deployment confirmation.
- AI brain still needs live holder/orderbook/contract/OSINT feeds.
- Visual VLM brain still needs a deep 3D/performance pass.
- Product catalog and fulfilment QA remain incomplete.
