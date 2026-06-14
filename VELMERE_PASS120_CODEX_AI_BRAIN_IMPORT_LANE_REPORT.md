# VELMERE PASS 120 — Codex AI Brain Import Lane + One-File Contract

## Base
Built on PASS 119.

## Why this pass
Codex was opening the wrong project and trying to inspect the full repo. The user clarified that Codex must work only on the exported AI brain file inside the `codex` folder.

This pass makes that workflow explicit and adds guards so future imports of the AI brain are safer.

## Implemented

### 1. New precise Codex prompt
Added:
- `docs/codex-handoff/CODEX_AI_RISK_BRAIN_ONLY_ONE_FILE_PASS3_PROMPT.md`

This prompt tells Codex:
- work only in `C:\Users\marci\Desktop\codex`
- edit only `CODEX_EDIT_THIS_ONE_FILE_AI_RISK_BRAIN_risk-engine (1).ts`
- do not open the full Velmère repo
- do not touch UI, animations, translations or deploy
- focus only on VLM AI risk brain scoring, confidence, limitations and meta-model

### 2. AI brain import guard
Added:
- `scripts/verify-ai-brain-import-contract.mjs`

New command:
- `npm run verify:ai-brain-import`

Checks:
- public exports remain
- risk-engine remains pure
- no `fetch`, `window`, `document`, Node APIs
- no `as any`
- no investment/hype/accusation wording
- every emitted `addSignal(...)` id exists in `RiskSignalId`
- required limitations remain
- the Codex prompt still forces one-file workflow

### 3. Vercel preflight protection
Updated:
- `scripts/vercel-preflight.mjs`

Now Vercel also blocks broken AI brain imports before build.

### 4. Import protocol docs
Added:
- `docs/launch/AI_RISK_BRAIN_IMPORT_PROTOCOL.md`
- `docs/launch/AI_RISK_BRAIN_SCENARIO_MATRIX.md`

The scenario matrix covers:
- BTC/ETH mega-cap
- stablecoin near peg
- stablecoin depeg
- RWA/tokenized fund
- low-float parabolic pump
- contract privilege cluster
- thin-liquidity exit risk
- no-data token

### 5. Shield Map visible product lane
Updated:
- `components/market-integrity/ShieldMapClient.tsx`

Added localized AI brain import lane:
- PL
- DE
- EN

It explains that Codex works only on the risk brain, while UI/deploy stay guarded.

## Validation
Passed:
- `node scripts/check-i18n.mjs` → exit 0
- `node scripts/vercel-preflight.mjs` → exit 0
- `node scripts/verify-market-integrity-no-truncation.mjs` → exit 0
- `node scripts/verify-shield-design-safety.mjs` → exit 0
- `node scripts/verify-risk-engine-safety.mjs` → exit 0
- `node scripts/verify-vlm-brain-performance.mjs` → exit 0
- `node scripts/verify-locale-surface.mjs` → exit 0
- `node scripts/verify-ai-brain-import-contract.mjs` → exit 0

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX TS/JS artifacts: 0
- old TokenRisk/risk-engine/VLM/PageCopy bad terms: 0

## Progress note

| Area | Previous | After PASS 120 | Change |
|---|---:|---:|---:|
| UI shell / layout | 50–51% | 51–52% | +1% |
| Shield terminal | 45–47% | 46–48% | +1% |
| VLM AI risk brain | 31–35% | 34–38% | +3% |
| VLM visual brain / motion | 38–42% | 38–42% | 0% |
| Data / API spine | 32–33% | 33–34% | +1% |
| Legal / launch safety | 52–54% | 54–56% | +2% |
| Mobile polish | 31–33% | 31–33% | 0% |
| Full translations | 42–45% | 43–46% | +1% |
| Clothing commerce readiness | 49–51% | 49–51% | 0% |
| Whole brand/site launch readiness | 48–50% | 50–52% | +2% |

## Remaining blockers
- Codex must return the final edited one-file AI brain.
- After import, full `npm run build` / Vercel deploy must be confirmed.
- Live data feeds and evidence export remain product blockers.
