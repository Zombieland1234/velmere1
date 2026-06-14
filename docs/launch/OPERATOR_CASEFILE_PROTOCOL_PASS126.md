# Velmère PASS 126 — Operator AI Casefile Protocol

## Purpose
The Shield should not only animate risk. It should convert every token scan into a calm operator case file: what is known, what is missing, what must be checked next, and which OSINT searches should run before a stronger verdict.

## Added layer
`lib/market-integrity/operator-casefile.ts` builds a deterministic case file from `TokenRiskResult`.

It produces:
- case id,
- evidence status,
- quick verdict,
- dominant agent,
- prioritized review lanes,
- blockers,
- OSINT query queue,
- operator checklist,
- copy guard.

## Product rule
Missing data is never safety. Low detected risk is only a statement about the currently attached source set.

## UI rule
The modal action panel now shows an operator casefile card so Basic/Pro/Advanced is tied to a useful investigation path, not just a visual sequence.

## Language rule
The casefile may say anomaly, review, unknown, red flag, missing evidence and manual review. It must not say safe investment, guaranteed, buy signal, sell signal, scam confirmed or fraud proven.
