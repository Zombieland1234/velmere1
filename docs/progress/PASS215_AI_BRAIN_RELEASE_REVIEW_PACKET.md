# PASS215 — AI Brain Release Review Packet

PASS215 adds a release review packet between the selected VLM Brain tile drawer and any future Shield Report/PDF route.

## What changed

- New typed contract: `vlm-brain-release-review-packet-v1-pass215`.
- New builder: `buildVlmBrainReleaseReviewPacket`.
- The drawer now shows decision, release score, blocker/review counts, customer copy mode and PDF preview gate.
- Release gates cover source coverage, freshness, redaction, durable case storage, customer copy and PDF route.
- Missing/blocked source lanes, stale freshness, redaction debt and non-durable case storage remain hard blockers.

## Safety boundary

- No customer export is enabled by this pass.
- No binary PDF is generated.
- Public/customer copy remains redacted and review-gated.
- Operator-only fields, source debt and raw payloads stay internal.
- No safety certificate, no final verdict and no financial advice wording is introduced.

## Product delta

| ID | Obszar | Previous | Current | Change |
|---|---|---:|---:|---:|
| D15 | Risk driver mapping | 77% | 80% | +3% |
| D16 | Source confidence lanes | 83% | 86% | +3% |
| D17 | Missing-data semantics | 86% | 88% | +2% |
| M01 | Velmère Shield Report | 65% | 70% | +5% |
| M05 | Redacted payload export | 69% | 74% | +5% |
| M06 | Report download route | 34% | 39% | +5% |
| M07 | Operator-only report fields | 72% | 78% | +6% |

**PASS215 product delta:** +29% on touched rows.

<!-- PASS215 marker: AI Brain Release Review Packet report -->
