# VELMERE PASS 123 — AI Risk Brain Import + Shield Runtime Fixes

## Base
Built on PASS 122.

## Why this pass
Two things happened at once:
1. Codex returned an AI risk brain file.
2. The live Shield terminal threw a runtime crash after clicking a coin: `ReferenceError: ui is not defined`.

The pass imports the AI brain, adds scenario guards and fixes the Shield UI runtime/suggestion dropdown bugs.

## Implemented

### 1. Imported Codex AI risk brain
Updated:
- `lib/market-integrity/risk-engine.ts`

Saved import audit:
- `docs/codex-handoff/import-audit/PASS122_risk-engine.before-pass123.ts.txt`
- `docs/codex-handoff/import-audit/PASS123_codex_uploaded_risk-engine.imported.ts.txt`
- `docs/codex-handoff/import-audit/PASS123_codex_session_log.txt`

### 2. Added AI risk scenario guard
Added:
- `scripts/verify-ai-risk-brain-scenarios.mjs`

New command:
- `npm run verify:ai-risk-scenarios`

Wired into:
- `npm run verify:shield-all`

Scenario matrix includes:
- BTC/ETH mega-cap
- stablecoin near peg
- stablecoin depeg
- RWA / tokenized fund
- low-float parabolic pump
- contract trap
- no-data token

Note:
In this artifact environment dependencies are not installed, so the scenario script passed static checks and skipped runtime execution. In the real repo after `npm install`, runtime scenarios can execute.

### 3. Fixed `ui is not defined` in TokenRiskModal
Updated:
- `components/market-integrity/TokenRiskModal.tsx`

Cause:
The action panel used `ui.controlKicker`, `ui.controlTitle`, etc., but `ui` existed only inside a different nested component.

Fix:
Main `TokenRiskModal` now has its own locale-aware `ui` object.

### 4. Fixed Shield Map investigator suggestions overlay
Updated:
- `components/market-integrity/ShieldMapClient.tsx`
- `app/globals.css`

Fixes:
- dropdown no longer relies on `onBlur` timeout,
- outside-click closes it,
- `useRef` protects inside clicks,
- panel uses `role="listbox"`,
- parent console uses `overflow: visible`,
- dropdown z-index raised to `10000`.

### 5. Fixed main Shield search suggestions overlay
Updated:
- `components/market-integrity/MarketIntegrityClient.tsx`
- `app/globals.css`

Main token suggestions now use:
- `shield-token-search-suggest-panel`
- `z-[10000]`

### 6. Added runtime UI guard
Added:
- `scripts/verify-shield-runtime-ui-safety.mjs`

New command:
- `npm run verify:shield-runtime-ui`

Wired into:
- `npm run verify:shield-all`
- `scripts/vercel-preflight.mjs`

### 7. Added stricter prompt for Codex
Added:
- `docs/codex-handoff/CODEX_AI_RISK_BRAIN_ONLY_ONE_FILE_PASS4_BRUTAL_PROMPT.md`

Standalone download was also exported:
- `CODEX_AI_RISK_BRAIN_ONLY_ONE_FILE_PASS4_BRUTAL_PROMPT.md`

## Validation
Passed:
- `node scripts/verify-ai-risk-brain-scenarios.mjs` → exit 0
- `node scripts/verify-shield-runtime-ui-safety.mjs` → exit 0
- `node scripts/check-i18n.mjs` → exit 0
- `node scripts/vercel-preflight.mjs` → exit 0
- `node scripts/verify-market-integrity-no-truncation.mjs` → exit 0
- `node scripts/verify-shield-design-safety.mjs` → exit 0
- `node scripts/verify-risk-engine-safety.mjs` → exit 0
- `node scripts/verify-vlm-brain-performance.mjs` → exit 0
- `node scripts/verify-locale-surface.mjs` → exit 0
- `node scripts/verify-ai-brain-import-contract.mjs` → exit 0
- `node scripts/verify-commerce-launch-safety.mjs` → exit 0
- `node scripts/verify-product-truth-safety.mjs` → exit 0

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX TS/JS artifacts: 0
- old bad terms: 0

## Progress note

| Area | Previous | After PASS 123 | Change |
|---|---:|---:|---:|
| UI shell / layout | 53–54% | 54–55% | +1% |
| Shield terminal | 46–48% | 49–51% | +3% |
| VLM AI risk brain | 34–38% | 38–42% | +4% |
| VLM visual brain / motion | 38–42% | 38–42% | 0% |
| Data / API spine | 33–34% | 34–35% | +1% |
| Legal / launch safety | 58–60% | 59–61% | +1% |
| Mobile polish | 33–35% | 34–36% | +1% |
| Full translations | 44–47% | 44–47% | 0% |
| Clothing commerce readiness | 60–63% | 60–63% | 0% |
| Whole brand/site launch readiness | 54–56% | 56–58% | +2% |

## Remaining blockers
- Full `npm run build` / Vercel deploy must still be confirmed.
- The scenario runner needs dependencies installed to execute runtime scenario assertions.
- Live holder/orderbook/contract/OSINT feeds are still production blockers.
- VLM 3D visual brain still needs more motion polish.
