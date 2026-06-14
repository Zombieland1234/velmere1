# PASS252 — AI Brain Release Cockpit

PASS252 is a real single-number mega-pass after PASS246–PASS251. It does not count multiple labels as multiple passes. The change adds one operator control surface inside the selected VLM Brain tile drawer.

## Product change

The selected tile now builds `VlmBrainReleaseCockpit` from the existing release readiness chain:

- PASS251 release readiness orchestrator
- PASS243 release triage board
- PASS224 release QA scorecard
- PASS247 browser evidence collector
- PASS248 adapter readiness scheduler
- PASS249 customer brief builder
- PASS250 wallet session policy
- PASS228 PDF route contract

The cockpit compresses those systems into one visible decision: hard block / review lock / operator preview only.

## Safety boundaries

The cockpit keeps disabled:

- customer export
- public route
- binary PDF download
- wallet access
- raw payload export

Browser QA remains required.

## Why this matters

The previous drawer had many separate panels, which could be read as fragmented approvals. PASS252 makes the top-level state impossible to miss and keeps every release path behind explicit source, browser, storage and redaction gates.
