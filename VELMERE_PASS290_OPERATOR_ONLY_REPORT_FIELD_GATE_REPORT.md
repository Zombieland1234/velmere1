# PASS290 — Operator-Only Report Field Gate

PASS290 continues the Velmère Shield / VLM report lane after PASS289 layout stabilization. It adds a **Private Disclosure Loom** to the token modal so customer report lines, redacted appendix fields and operator-only reasoning are separated before any PDF/customer preview is trusted.

## Web scan direction

- MEXC direction: chart, order book, market depth and live market context should stay close to the decision surface. Velmère uses that pattern by keeping source replay, PDF state and field separation inside the token modal rather than hiding it in a distant report screen.
- LVMH / Aura direction: premium trust is built through traceability, authenticity, transparency and controlled disclosure. Velmère uses that pattern as a private proof/status seal, not as hype.

## Implemented

- Added `lib/market-integrity/operator-only-report-field-gate.ts`.
- Added `buildOperatorOnlyReportFieldGate(...)` into `TokenRiskModal.tsx`.
- Added UI rail `shield-pass290-disclosure-loom` with:
  - customer preview lines,
  - operator vault lines,
  - report field classes,
  - source replay lane,
  - privacy payload lane,
  - PDF signature lane,
  - browser trace lane,
  - retention/delete lane.
- Added PASS290 CSS block to `app/globals.css`.
- Added `scripts/verify-pass290-operator-only-report-field-gate-safety.mjs`.
- Added `verify:pass290-operator-only-report-field-gate` and appended it to `verify:shield-all`.

## Real error fixed

- Fixed a real TypeScript issue in `layout-stability-sentinel-gate.ts`: it referenced `result.missingInputs`, which is not part of `TokenRiskResult`.
- Replaced it with a safe calculation from `result.signals` and `result.dataQuality`.

## Safety / psychology boundary

- FOMO is inverted into anti-FOMO: missing privacy/source/storage/replay data slows release and freezes premium status.
- Elite status is earned only by evidence separation, source replay and redaction.
- Customer copy cannot include raw payloads, wallet/IP context, operator memo, trade prompts, certainty language or safety-certificate wording.

## Delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| M07 | Operator-only report fields | 96 | 99 | +3 |
| M06 | Report download route | 51 | 54 | +3 |
| M05 | Redacted payload export | 95 | 96 | +1 |
| K05 | Privacy redaction envelope | 95 | 96 | +1 |
| K04 | Storage adapter contract | 58 | 60 | +2 |
| J04 | Scroll lock / z-index layers | 99 | 100 | +1 |
| A03 | TypeScript sanity | 94 | 95 | +1 |
| D20 | Brain portal layering / scroll lock | 98 | 99 | +1 |
| E02 | Lens search UX | 90 | 91 | +1 |

PASS290 total: +14 points.
Tracker from PASS267: +398 points.

## Validation

```bash
npm run verify:pass290-operator-only-report-field-gate
npm run verify:pass289-layout-stability-sentinel-gate
npm run check:i18n
npm run vercel:preflight
```

Additional targeted TypeScript check passed for:

```bash
tsc --noEmit --target ES2021 --module ESNext --moduleResolution node --skipLibCheck lib/market-integrity/operator-only-report-field-gate.ts lib/market-integrity/layout-stability-sentinel-gate.ts
```

Full project `npm run typecheck` is still not green in this ZIP because the package has no installed `node_modules`/Next/React/Node type environment and legacy project errors remain outside PASS290.

<!-- PASS290 marker: Operator-only report field gate active. -->
