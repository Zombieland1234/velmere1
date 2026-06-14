# VELMERE MASTER BUILD MAP — PASS298 update

PASS298 continues the granular A–M map and keeps AI Brain separated instead of collapsing D into one line. This pass focuses on L02/K02/D16/D17/M01/M03/M05/M08.

## PASS298 — Reserve Provenance Twin Gate

Added a Reserve-Provenance Twin across VLM Browser/Lens, Shield terminal and Shield Map.

The gate binds together:
- MEXC-style reserve transparency and market depth context,
- LVMH/Aura-style digital product passport/provenance logic,
- Velmère anti-FOMO friction and operator-only boundaries.

### PASS298 delta

| ID | Group | Area | Previous | Current | Change | Status |
|---|---:|---|---:|---:|---:|---|
| L02 | L | Orderbook feed / depth context | 31% | 34% | +3% | partial |
| K02 | K | Source freshness registry | 53% | 55% | +2% | blocked/partial |
| K05 | K | Privacy redaction envelope | 98% | 99% | +1% | solid |
| D16 | D | Source confidence lanes | 94% | 95% | +1% | solid |
| D17 | D | Missing-data semantics | 95% | 96% | +1% | solid |
| M01 | M | Velmère Shield Report | 77% | 79% | +2% | partial |
| M03 | M | Evidence Note | 80% | 82% | +2% | partial |
| M05 | M | Redacted payload export | 98% | 99% | +1% | solid |
| M08 | M | PDF/browser replay boundary | 51% | 53% | +2% | partial |

**PASS298 product delta:** +15 points on touched rows.

## New markers

- `PASS298_RESERVE_PROVENANCE_TWIN_GATE`
- `velmere_reserve_provenance_twin_gate_v1_pass298`
- `data-pass298-reserve-provenance-twin="vlm-browser"`
- `data-pass298-reserve-provenance-twin="shield-terminal"`
- `data-pass298-reserve-provenance-twin="shield-map"`
- `data-pass298-result-twin="reserve-provenance-receipt"`

## Next recommended IDs

1. L01 Holder feed: connect reserve/provenance twin to holder concentration evidence.
2. L03 Contract analyzer: owner/proxy/mint/pause/tax scanner.
3. K04 Storage adapter contract: server-only snapshot persistence.
4. M06 Report download route: move preview PDF toward real server-rendered PDF.
5. A03/A06: type/runtime stability sweep once dependencies are installed.

<!-- PASS298 marker: Reserve-Provenance Twin Gate added to Lens, Shield terminal and Shield Map. -->

## PASS299 addition — Runtime Search Quarantine Gate

PASS299 fixes a real runtime issue reported in the token modal: `mode` was referenced in the layout sentinel before any local variable existed. The modal now uses a safe `layoutSentinelMode` derived from `vlmSequenceMode ?? "basic"` and declares it before dependent layout gates.

Search layers now self-quarantine when a token modal or Shield Map scan opens: the main Shield suggestions close before `setSelected`, the portal cannot render while `selected` exists, and Shield Map suggestions close during investigator loading/result states.

Tracked movement:

- A06 Runtime observability: 77% → 81%
- A03 TypeScript sanity: 97% → 98%
- C02 Shield search dropdown: 99% → 100%
- J03 Responsive layout: 88% → 89%

<!-- PASS299 marker: runtime search quarantine fixes TokenRiskModal mode scope and closes search portals behind modal/scan surfaces. -->
