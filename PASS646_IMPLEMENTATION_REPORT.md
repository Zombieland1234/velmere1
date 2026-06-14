# Velmère PASS642–646 Implementation Report

Date: 2026-06-09
Base: PASS641 production release
Release theme: unified evidence, PDF accessibility boundary, visual parity, outage replay, mobile performance, first Shield modal decomposition

## PASS642 — PDF/UA external validation lane

Implemented a typed validation boundary around the PASS611 tagged-PDF foundation.

- Internal structure checks remain separate from an external conformance result.
- A PDF/UA claim is emitted only when the exact binary has:
  - a machine validation receipt,
  - zero machine failures,
  - an explicit human-review result,
  - a SHA-256 binding the receipt to the validated PDF.
- Internal structure may report `structural_ready`, but it cannot advertise PDF/UA compliance.
- Added a CLI lane for veraPDF-compatible validation receipts.

This intentionally avoids a false compliance badge. Machine validation is necessary but not sufficient for every accessibility checkpoint.

## PASS643 — Reader/PDF visual parity matrix

Added a deterministic parity contract covering 27 required combinations:

- PL / EN / DE,
- Basic / Pro / Advanced,
- normal / dense / extreme fixtures.

The matrix verifies:

- unique page IDs,
- stable section ordering,
- no content-loss allowance,
- long symbol and long provider labels,
- unbroken-word handling,
- dense missing-source appendices.

A Playwright screenshot specification was added for locale/depth parity and horizontal-overflow checks.

## PASS644 — source outage replay lab

Added five canonical source states:

- live,
- partial,
- stale,
- fallback,
- offline.

Each replay produces one digest shared by Browser, PDF, Shield, Shield Map and VLM Brain. Offline and fallback states cannot confirm a current fact. The same source state and confidence boundary must survive every surface handoff.

## PASS645 — premium mobile performance budget

Added measurable release thresholds for 320, 360, 390 and 430 px viewports:

- INP budget: 200 ms,
- CLS budget: 0.10,
- long-task boundary: 50 ms,
- animation-frame budget: 20 ms,
- maximum one active WebGL scene,
- hidden scenes must be frozen,
- horizontal overflow tolerance: 4 px.

Added a Playwright performance specification for mobile widths, reduced motion, hidden-scene freezing and overflow.

## PASS646 — unified evidence ledger

Implemented one evidence identity across:

- Browser,
- PDF,
- Shield,
- Shield Map,
- VLM Brain,
- Real Markets.

The ledger carries a shared report ID, snapshot ID, manifest key and evidence key. It blocks duplicate source IDs, duplicate claim IDs and orphan claims. The Lens endpoint now exposes the evidence and snapshot identity in response headers.

## First TokenRiskModal decomposition

The largest component remains a significant technical-debt area, but the first safe extraction is complete:

- `ShieldEvidenceSummary.tsx` now owns the public source/candle/gap/state strip and tier evidence summary.
- `ShieldAnalysisTierSelector.tsx` now owns Basic/Pro/Advanced selection, field budgets, missing counts, pressed state and mobile interaction markers.
- `TokenRiskModal.tsx` was reduced while preserving historical verifier compatibility and existing behavior.

No feature was removed. The next decomposition should separate chart workspace, source ledger, AI sequence controller and mobile navigation.

## Validation performed

- i18n PL/DE/EN: PASS
- PASS607–611: PASS
- PASS612–616: PASS
- PASS617–621: PASS
- PASS622–626: PASS
- PASS627–631: PASS
- PASS632–636: PASS
- PASS637–641 contract verifier: PASS with Node 22 environment warning
- PASS642–646 runtime verifier: PASS
- PASS646 strict core TypeScript: PASS
- Vercel preflight: PASS — 922 files
- TypeScript/TSX syntax parser: PASS — 932 files, 0 syntax errors
- ZIP integrity and forbidden-artifact scan: recorded during packaging

## Validation not claimed

The modified PASS646 tree did not receive a fresh full `next build`, full semantic repository typecheck, or executed Chromium matrix in this sandbox because dependencies are not included and the attempted clean install exceeded the environment memory budget. The PASS641 base contains prior production-build proof; PASS646 changes still require Node.js 20 CI validation before deployment.

No veraPDF/PAC conformance claim is made because no exact generated PDF binary was validated by an external tool and human review in this run.
