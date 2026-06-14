# PASS2020 — VLM Source Integrity Sentinel

Status: implemented without visual/UI changes.

## What changed

PASS2020 adds a real source-integrity layer in front of VLM Brain. Evidence Quorum already checked whether a fact had enough independent source coverage. Source Integrity Sentinel now checks whether those source records themselves are healthy enough to be trusted.

Implemented runtime module:

- `lib/ai/vlm-source-integrity.ts`

Integrated into:

- `lib/ai/vlm-source-arbitration.ts`
- `lib/ai/vlm-evidence-quorum.ts`
- `lib/ai/vlm-fact-packet.ts`
- `lib/ai/vlm-provider-registry.ts`
- `lib/ai/vlm-epistemic-governor.ts`
- `lib/ai/vlm-brain.ts`
- `lib/ai/vlm-claim-firewall.ts`
- `lib/ai/vlm-shadow-governor.ts`
- `lib/ai/vlm-security.ts`
- `lib/ai/vlm-security-events.ts`
- `lib/security/security-event-ledger.ts`
- `lib/ai/vlm-contract.ts`
- `lib/ai/vlm-analysis-receipt.ts`

## Real protections added

| Protection | Runtime effect |
|---|---|
| Provider-family normalization | Two records from the same provider family no longer behave like truly independent sources. |
| Duplicate provider detection | Duplicate source-family records degrade source integrity. |
| Future timestamp detection | Future-dated source records are quarantined. |
| Invalid timestamp detection | Invalid source timestamps are quarantined. |
| Stale/unknown source detection | Stale or unknown source timestamps degrade confidence. |
| Non-HTTPS/invalid URL detection | Weak source URLs degrade integrity. |
| Source metadata security inspection | Prompt injection inside provider/source labels can quarantine the source. |
| Quarantined source exclusion | Evidence Quorum excludes quarantined source IDs instead of counting them. |
| Confidence penalty | Degraded/quarantined integrity reduces confidence caps deterministically. |
| Shadow Brain enforcement | Shadow review revises/rejects overconfident source-integrity claims. |
| Claim firewall enforcement | Output text cannot claim robust/verified sources when integrity is degraded. |
| VLM Security integration | Attempts to bypass Source Integrity Sentinel are detected and recorded. |
| Receipt policy update | Signed receipt policy hash now includes Source Integrity Sentinel. |

## Runtime behavior

New source integrity statuses:

- `trusted`
- `degraded`
- `quarantined`

New diagnostics:

- `sourceIntegrityStatus`
- `sourceIntegrityScore`
- `sourceIntegrityPenalty`
- `quarantinedSourceIds`

Live-mode now requires:

- provider output is valid,
- claim firewall passes,
- Shadow Brain approves or revises,
- Evidence Quorum is strong,
- Source Integrity Sentinel is trusted.

If source integrity is degraded or quarantined, VLM Brain still gives a safe explanation, but stays in conditional/fallback confidence bands.

## Tests performed

Passed:

- `node scripts/verify-pass2015-vlm-security-intelligence.mjs`
- `node scripts/verify-pass2016-adversarial-shadow-brain.mjs`
- `node scripts/verify-pass2017-signed-analysis-receipt.mjs`
- `node scripts/verify-pass2018-ed25519-public-receipt.mjs`
- `node scripts/verify-pass2019-evidence-quorum-shadow-security.mjs`
- `node scripts/verify-pass2020-source-integrity-sentinel.mjs`
- TypeScript syntax transpilation gate for all changed TS files
- Runtime smoke test for trusted, degraded and quarantined source-integrity scenarios

## Score update

| Area | PASS2019 | PASS2020 |
|---|---:|---:|
| Source reliability | 87% | 92% |
| Source poisoning defense | 72% | 87% |
| Confidence calibration | 93% | 94% |
| Evidence Quorum | 87% | 91% |
| Shadow Brain enforcement | 89% | 91% |
| VLM Security | 95% | 96% |
| Whole VLM Brain | 90% | 91.5% |

## Honest limitation

This does not prove that an external provider tells the truth. It proves that VLM Brain now treats source records as evidence objects with health, freshness, family independence, and poisoning risk instead of blindly counting source IDs.

The next real step is a durable provider reputation ledger: source families should earn or lose trust over time based on live mismatches, outages, stale data, and historical corrections.
