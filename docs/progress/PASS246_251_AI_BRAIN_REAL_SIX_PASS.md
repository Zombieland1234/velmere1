# PASS246–PASS251 — AI Brain Real Six-Pass Branch

This branch is intentionally counted as six real implementation passes because it adds six new typed contracts, six modal render surfaces, CSS containment, preflight/package guards and release-readiness wiring.

## PASS246 — Export Authorization Gate
- One operator-only gate combines release triage, handoff vault, browser replay and QA scorecard.
- Public export, binary PDF, customer copy, wallet access and raw payload stay blocked.

## PASS247 — Browser Evidence Collector
- Browser replay steps become concrete evidence artifacts: screenshot, FPS sample, keyboard trace, route response and network context.
- WebGL comparison remains QA-only.

## PASS248 — Adapter Readiness Scheduler
- Holder/orderbook/contract/OSINT/source freshness gaps are converted into P0/P1/P2 tasks.
- Browser-only data is blocked from acting like production evidence.

## PASS249 — Customer Brief Builder
- Builds sanitized customer-brief preview sections.
- Public route/customer copy remain disabled and unsafe/overclaim wording is scrubbed.

## PASS250 — Wallet Session Policy
- Creates session/entitlement/signature lanes.
- Seed phrase, private key, ROI copy and public-sale framing are blocked.

## PASS251 — Release Readiness Orchestrator
- Aggregates export authorization, browser evidence, adapter scheduler, customer brief, wallet session, durable snapshot and PDF manifest into a single release decision.
- Public release stays blocked until real Vercel QA, durable stores, redaction and PDF/wallet gates pass.
