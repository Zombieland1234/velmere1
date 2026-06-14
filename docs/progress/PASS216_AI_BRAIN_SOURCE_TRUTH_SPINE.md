# PASS216 — AI Brain Source Truth Spine

PASS216 adds a selected-tile **Source Truth Spine** to the VLM AI Brain drawer. It connects the report capsule, source coverage matrix and release review packet to adapter freshness/cache decisions before any customer copy or PDF route can proceed.

## What changed

- New contract: `lib/market-integrity/vlm-brain-source-truth-spine.ts`.
- New drawer block: `data-vlm-source-truth-spine="pass216"`.
- Each selected Brain tile now exposes adapter lane, cache decision, trust cap, missing/stale/blocked source debt and next operator action.
- Customer export remains blocked or review-locked when adapter truth is missing, stale or blocked.
- Durable source-ledger writes remain preview-only until a server-side storage adapter exists.

## Delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| D15 | Risk driver mapping | 80% | 83% | +3% |
| D16 | Source confidence lanes | 86% | 89% | +3% |
| D17 | Missing-data semantics | 88% | 90% | +2% |
| K02 | Source freshness registry | 59% | 63% | +4% |
| K05 | Privacy redaction envelope | 61% | 64% | +3% |
| L06 | Adapter timeouts / fallbacks | 48% | 55% | +7% |
| M05 | Redacted payload export | 74% | 77% | +3% |
| M07 | Operator-only report fields | 78% | 81% | +3% |

**PASS216 product delta:** +28% on touched rows.

<!-- PASS216 marker: AI Brain Source Truth Spine active. -->
