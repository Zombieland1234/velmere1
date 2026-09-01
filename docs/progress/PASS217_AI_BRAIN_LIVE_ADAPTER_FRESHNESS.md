# PASS217 — AI Brain Live Adapter Freshness Mesh

Selected VLM Brain tile now builds a live adapter freshness mesh above the source-truth spine. The drawer exposes TTL window, cache decision, live/usable/stale/expired/blocked state, refresh priority, hard-stop count, source-ledger preview state and customer export gate.

This is still an operator preview. It does not enable customer export, binary PDF download, durable source writes or any safety/trading verdict.

## Product change

- Adds `vlm-brain-live-adapter-freshness-v1-pass217` typed contract.
- Connects source-truth spine lanes to TTL/cache/hard-stop gates.
- Adds drawer UI block with freshness score, refresh count, hard stop count and lane actions.
- Keeps stale, expired and blocked lanes operator-only.
- Keeps source ledger write in preview-only mode until server durable storage exists.

## Delta

| Area | Previous | Current | Change |
|---|---:|---:|---:|
| D16 Source confidence lanes | 89% | 91% | +2% |
| D17 Missing-data semantics | 90% | 91% | +1% |
| D21 Brain telemetry / FPS QA | 64% | 66% | +2% |
| K02 Source freshness registry | 63% | 68% | +5% |
| K05 Privacy redaction envelope | 64% | 66% | +2% |
| L06 Adapter timeouts / fallbacks | 55% | 62% | +7% |
| L07 Allowlists / source policy | 30% | 34% | +4% |
| M05 Redacted payload export | 77% | 79% | +2% |
| M07 Operator-only report fields | 81% | 84% | +3% |

## Validation target

- `node scripts/verify-pass217-ai-brain-live-adapter-freshness-safety.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `npm run verify:pass217-ai-brain-live-adapter-freshness`
- `npm run verify:shield-all`

<!-- PASS217 marker: AI Brain Live Adapter Freshness Mesh active. -->
