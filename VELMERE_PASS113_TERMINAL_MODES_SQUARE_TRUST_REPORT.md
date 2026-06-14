# VELMERE PASS 113 — Terminal Basic/Pro/Advanced Lanes + Square Trust Rail

## Base
Built on PASS 112.

## Main purpose
Keep developing while Codex works on the real `risk-engine.ts` AI brain.

## Implemented

### 1. Token terminal Basic / Pro / Advanced action panel
Updated:
- `components/market-integrity/TokenRiskModal.tsx`

Changed:
- hardcoded mixed PL/EN copy replaced with locale-aware UI strings
- Basic Analysis remains an animation/readout path
- Advanced Analysis remains the deeper VLM investigator/readout path
- added Pro Review as a member/source cockpit lane linking to `/member`
- action copy is now PL / DE / EN aware
- no chat panel is introduced

This makes the terminal product logic clearer:
- Basic = public prescreen
- Pro = member cockpit/source context
- Advanced = investigator mode

### 2. Square trust and moderation rail
Updated:
- `components/square/VelmereSquareClient.tsx`

Added localized trust/moderation section:
- no wallet pressure
- account-gated publishing
- access-gated member rooms
- no seed phrase requests
- token/market discussion must use Shield-safe language: anomaly, review, uncertainty

Languages:
- PL
- DE
- EN

### 3. i18n guard fix
`check-i18n` flagged a visible `VLM.` ending in TokenRiskModal copy through its stale-copy regex.

Fixed:
- removed period after visible VLM title copy while preserving meaning

## Validation
Passed:
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX TS/JS artifacts: 0
- old TokenRisk/risk-engine bad terms: 0

## Progress note

| Area | Previous | After PASS 113 | Change |
|---|---:|---:|---:|
| UI shell / layout | 42–44% | 44–45% | +1% |
| Shield terminal | 36–38% | 38–40% | +2% |
| VLM AI risk brain | 18–25% | 18–25% | 0% |
| Data / API spine | 30–31% | 30–31% | 0% |
| Legal / launch safety | 42–43% | 44–45% | +2% |
| Mobile polish | 22–23% | 23–24% | +1% |
| Full translations | 29–30% | 31–32% | +2% |
| Whole brand/site launch readiness | 33–34% | 35–36% | +2% |

## Next PASS 114
Recommended:
- integrate Codex `risk-engine.ts` if returned
- otherwise continue Shield Map legacy translation cleanup
- add Basic/Pro/Advanced labels into table/filter UI
- improve mobile terminal layout
- continue visual VLM brain 3D/performance pass
