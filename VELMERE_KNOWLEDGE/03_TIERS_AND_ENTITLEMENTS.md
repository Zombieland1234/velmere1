# 03 — TIERS AND ENTITLEMENTS

UPDATED: 2026-09-02 | CLASSIFICATION: HISTORICAL_UNTRUSTED (will be revalidated in Pas 2)

## Tier definitions

Three tiers exist in the codebase: Basic / Pro / Advanced.

The 20 customer rows combine product × tier:

| Product | Basic | Pro | Advanced |
|---|---|---|---|
| Audit | rows 1 | 2 | 3 |
| Browser | rows 4 | 5 | 6 |
| Shield | rows 7 | 8 | 9 |
| Shield Pro | rows 10 | 11 | 12 |
| Real Markets | rows 13 | 14 | 15 |
| Shield Map | (standalone — row 16) | | |
| Market Impact | (standalone — row 17) | | |
| Whale Watch | (standalone — row 18) | | |
| Angel | (standalone — row 19) | | |
| Risk Indicator | (standalone — row 20) | | |

## What is included / excluded (initial classification, HISTORICAL_UNTRUSTED)

| Tier | What is included (claimed) | What is intentionally excluded |
|---|---|---|
| Basic | Audit intake, Shield Basic terminal, Real Markets catalog, Angel free use, Browser free browse | Real live data (mostly withheld without provider keys) |
| Pro | Shield Pro, Real Markets Pro, deeper Audit | Currently STOP-SELL active |
| Advanced | Everything, deepest analysis, PDF | Currently STOP-SELL active |

**WARNING**: This table is from Pas 0 review summary + master mission
references. Full server-side enforcement verification is Pas 4 + Pas 19 work.

## Server enforcement vs UI-only

Per master mission §32:

> If Pro/Advanced are correctly blocked: verify UI blocked, direct API
> blocked, entitlement not accidentally created, client cannot bypass,
> server cannot be tricked, copy is truthful, customer understands why
> unavailable.

This verification is the work of Pas 4 (Płatności + Baza).

## API endpoints enforcing tiers

NOT_INVESTIGATED in Pas 1. Will be enumerated in Pas 4.

## Artifacts generated per tier

Historical claim (Pas 0 review): 9 PDFs = 3 tiers × 3 locales.
NOT yet revalidated locally.

## Data available per tier

UNKNOWN per Pas 1. Deeper inspection is Pas 2 + Pas 13.

## Customer outcome improvements

UNKNOWN per Pas 1. Requires real tier comparison (Pas 8).

## Sellable capability

| Capability | Currently sellable? | Evidence |
|---|---|---|
| Audit Basic (intake) | Yes (free) | Pas 0 review |
| Angel API access (no live data) | Maybe after B-001/B-002 | Pas 0 review suggests ~19 PLN/mies |
| Shield (with CoinGecko) | Yes after B-001 | Pas 0 review suggests ~49 PLN/mies |
| Real Markets | Yes after B-001 + B-003 | Pas 0 review |
| Audit Pro/Advanced | NO (stop-sell + B-005/B-004) | Pas 0 review |

## Stop-sell state

ACTIVE for Pro/Advanced across products per Pas 0 review and
`config/pass21/provider-commercial-rights-registry.json` inspection.

## Direct API bypass tests

NOT yet performed. Pas 4 work.

## What Pas 2 + Pas 4 will add

- Confirmed API endpoint per tier boundary
- Real response test per tier boundary
- Real server-side enforcement test
- Direct API bypass test
- Customer-told-truth test (does the UI honestly explain why?)