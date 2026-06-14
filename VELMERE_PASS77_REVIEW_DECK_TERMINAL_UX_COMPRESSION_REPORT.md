# Velmère PASS 77 — Review Deck / Terminal UX Compression

## Scope
PASS77 compresses the token terminal into a first-screen review deck so the first click does not feel like a wall of panels. It keeps Shield Map as a dedicated product/OS page and adds regression checks for the new deck.

## Product changes
- Added Terminal Review Deck module.
- Added `/api/market-integrity/review-deck`.
- Added `terminalReviewDeck` to the full report endpoint.
- Set the default modal command to `/deck`.
- Added Review Deck panel in `TokenRiskModal`.
- Added Review Deck section in `ShieldMapClient`.
- Added CSS classes for review deck cards and Shield Map deck cards.

## UX rules
- First screen: chart, command palette and Review Deck.
- Deep modules stay hidden until requested by a command.
- Source truth, evidence blockers and launch blockers stay visible before strong AI summaries.
- Shield language remains anomaly/review/uncertainty, not accusation or advice.

## Legal / product guardrails
Not financial advice. Algorithmic risk flag only. VLM remains an access/utility layer, not an investment product.
