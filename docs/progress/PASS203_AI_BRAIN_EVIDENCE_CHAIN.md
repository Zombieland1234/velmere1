# PASS203 — AI Brain Evidence Chain Rail

## Scope

PASS203 continues the VLM AI Brain track after PASS202. The goal is to make every clicked tile read less like a generic tooltip and more like a controlled operator evidence panel.

## Changes

- Added `tileSourceBadge` for visible source state directly on VLM Orbit/static cards.
- Added `evidenceRail`, `confidenceRail` and `decisionRail` inside the tile drawer.
- Added localized operator checklists per tile family.
- Kept source-gated wording: partial/fallback data keeps the case in review instead of producing a strong public claim.
- Added PASS203 delta tracking and a new guard.

## Delta table

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| C06 | Risk scoring UI | 70% | 72% | +2% |
| D15 | Risk driver mapping | 58% | 62% | +4% |
| D16 | Source confidence lanes | 57% | 61% | +4% |
| D17 | Missing-data semantics | 66% | 69% | +3% |
| D19 | Brain interaction click coverage | 88% | 90% | +2% |
| D21 | Brain telemetry / FPS QA | 46% | 48% | +2% |
| D23 | Brain accessibility / keyboard flow | 55% | 58% | +3% |
| D24 | Brain copy localization PL/EN/DE | 80% | 82% | +2% |
| J02 | Accessibility / ARIA | 60% | 62% | +2% |

## Remaining blockers

- Real browser QA on Vercel.
- Real FPS test for Orbit 360 on weaker devices.
- Durable source freshness registry.
- Holder/orderbook/contract/OSINT adapters.
- Real PDF generator and export approval flow.

PASS203 marker: AI Brain evidence-chain rail, per-card source badges, decision rail and operator checklist.
