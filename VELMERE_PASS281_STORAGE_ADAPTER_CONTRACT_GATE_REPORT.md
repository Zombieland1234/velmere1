# PASS281 — Storage Adapter Contract Gate

## Scope
- Primary ID: K04 Storage adapter contract.
- Supporting IDs: K01 durable audit ledger, K05 privacy redaction envelope, K06 operator cases, M05 redacted payload export, M04 safe export wording.

## Web scan applied
- MEXC direction: trading surfaces keep chart, depth/orderbook and source freshness close to the decision surface.
- LVMH direction: luxury trust is based on traceability, transparency, excellence and quiet proof rather than loud status/FOMO.

## Implemented
- Added `lib/market-integrity/storage-adapter-contract-gate.ts`.
- Added token modal rail `data-pass281-storage-adapter-contract-gate`.
- Added lanes for `case_write`, `source_snapshot`, `analytics_event`, `receipt_hash`, `retention_rule`, and `export_replay`.
- Added the UI innovation **Quiet Storage Covenant**: premium status appears only when storage is server-side, redacted, idempotent and retention-bound.
- Fixed a real guard coverage regression: `verify:shield-all` now includes PASS279, PASS280 and PASS281 instead of stopping at PASS278.

## Safety boundaries
- No public safety certificate wording.
- No profit, buy/sell, countdown or investment advice language.
- Browser/localStorage preview cannot be treated as durable proof.
- Raw wallet, IP, raw query and customer PII payloads remain blocked.

## Delta
| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| K04 | Storage adapter contract | 40 | 49 | +9 |
| K01 | Durable audit ledger | 50 | 53 | +3 |
| K05 | Privacy redaction envelope | 79 | 82 | +3 |
| K06 | Operator cases | 55 | 58 | +3 |
| M05 | Redacted payload export | 82 | 84 | +2 |
| M04 | Safe export wording | 95 | 96 | +1 |

**PASS281 total: +21 points.**
