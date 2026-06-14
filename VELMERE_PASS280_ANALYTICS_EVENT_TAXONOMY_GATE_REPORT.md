# PASS280 — Analytics Event Taxonomy Gate

## Scope

PASS280 advances the next Velmère map ID: **K03 Analytics event taxonomy**.
It also touches K05, K06, M05, M04 and D17 because event analytics must be privacy-safe, redacted and source-aware before they can support release or product decisions.

## Web scan applied before implementation

- MEXC direction: keep chart/depth/orderbook/live source states close to decisions and make failure/freshness visible instead of hiding it.
- LVMH/Aura direction: premium trust comes from traceability, authenticity proof and controlled data exposure, not noisy urgency.

## Implemented product changes

- Added `lib/market-integrity/analytics-event-taxonomy-gate.ts`.
- Added the token modal **analytics event taxonomy gate** with `data-pass280-analytics-event-taxonomy-gate`.
- Added typed event lanes:
  - token modal view,
  - chart gesture,
  - Basic/Pro/Advanced switch,
  - source gate view,
  - export intent,
  - anti-FOMO cooldown.
- Added the **Velvet Event Passport** innovation: event telemetry only gets a private status once it is aggregate/redacted/operator-only and receipt-bound.
- Raw payload, wallet, IP, customer PII and unredacted export attempts remain blocked.
- Fixed a real TypeScript syntax issue from PASS279: duplicated `result` parameter in `buildSourceFreshnessRegistryGate`.

## Delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| K03 | Analytics event taxonomy | 39 | 49 | +10 |
| K05 | Privacy redaction envelope | 76 | 79 | +3 |
| K06 | Operator cases | 52 | 55 | +3 |
| D17 | Missing-data semantics | 100 | 100 | +0 |
| M05 | Redacted payload export | 80 | 82 | +2 |
| M04 | Safe export wording | 94 | 95 | +1 |

**PASS280 product delta:** +19 points on touched rows.

## Guard

```bash
npm run verify:pass280-analytics-event-taxonomy-gate
```

## Boundary

The gate may only say telemetry is privacy-preserving and used to improve reliability. It must not say safety, guaranteed profit, no risk, certificate, financial advice, buy now or sell now.
