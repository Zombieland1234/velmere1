# PASS284 — Retention Policy Gate

## Scope
- Next map ID: **K07 Retention policy**.
- Supporting IDs: K04, K05, K06, M05, M04.
- Product surface: TokenRiskModal private operator rails.

## Web scan used before implementation
- MEXC direction: chart/depth/orderbook/live market context should stay close to the decision surface.
- LVMH/Aura direction: luxury trust should come from traceability, transparency, authenticity/proof and controlled disclosure rather than noisy pressure.

## Innovation
**Quiet Vault Clock / Velvet TTL Seal**.
The modal now shows whether every evidence class has a bounded TTL/delete/export policy before any customer-safe summary can advance.

## Implemented
- `lib/market-integrity/retention-policy-gate.ts`
- Token modal rail: `data-pass284-retention-policy-gate`
- Lane UI: `source snapshot`, `analytics event`, `operator case`, `receipt hash`, `customer export`, `browser trace`, `wallet/IP context`
- Raw wallet/IP and raw query retention are blocked.
- Browser/localStorage preview is not treated as durable retention proof.
- Customer copy remains locked until storage, redaction, owner and TTL/delete policy exist.

## Delta
| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| K07 | Retention policy | 20 | 34 | +14 |
| K04 | Storage adapter contract | 53 | 55 | +2 |
| K05 | Privacy redaction envelope | 90 | 92 | +2 |
| K06 | Operator cases | 68 | 71 | +3 |
| M05 | Redacted payload export | 87 | 89 | +2 |
| M04 | Safe export wording | 98 | 99 | +1 |

**PASS284 total:** +24.
**Tracker from PASS267:** +303.

## Guard
`npm run verify:pass284-retention-policy-gate`

## Release boundary
This is still an operator-side preview. It does not make public export, binary PDF, wallet access or customer certificate wording ready.
