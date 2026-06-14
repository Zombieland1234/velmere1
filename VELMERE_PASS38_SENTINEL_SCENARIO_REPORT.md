# Velmère Pass 38 — Sentinel Agent + Scenario Matrix

## Scope
This pass extends Velmère Shield beyond token-by-token inspection by adding a compact Sentinel agent and an evidence/scenario layer inside the token modal.

## Added
- `lib/market-integrity/risk-alerts.ts`
  - Builds ranked Sentinel alerts from market rows.
  - Classifies critical clusters, rising risk, parabolic pump, liquidity stress and data gaps.
- `/api/market-integrity/sentinel`
  - Server-side endpoint that sweeps market data and returns compact alert cards.
- Market Integrity dashboard
  - Added a compact Shield Sentinel strip under the search section.
  - Keeps the main page clean while still exposing important anomalies.
- Token modal
  - Added Evidence JSON link for forensic export.
  - Added Shield Scenario Matrix:
    - Pump velocity
    - Exit liquidity
    - Order book stress
    - Forensic review need
- Preflight guards
  - Guard for Sentinel endpoint/library/UI.
  - Guard for scenario matrix and evidence export.

## Checks
- `node scripts/check-i18n.mjs` ✅
- `node scripts/vercel-preflight.mjs` ✅
- zip test ✅

## Honest limitations
This is still an MVP/regtech prototype. It uses live market APIs and local/persistent ledger adapters where configured. Full institutional AI still requires persistent data infrastructure, chain indexers, social scanners, contract simulation, wallet clustering and model training/evaluation.
