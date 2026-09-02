# 00 — MASTER CONTEXT (compressed understanding of Velmère)

UPDATED: 2026-09-02 | SOURCE: current local repo inspection (Pas 1)
CLASSIFICATION: PROVEN_LOCAL (initial snapshot, will be revalidated)

## What is Velmère

A premium risk + evidence + market intelligence platform for crypto / Web3
addresses, instruments and on-chain activity. Positioned as
SECURITY + EVIDENCE PROVENANCE + RISK INTELLIGENCE + MARKET INTELLIGENCE +
DECISION SUPPORT (per master mission §1 final business objective).

## Problem solved

Give a non-technical customer (and a sophisticated customer) a way to look
at a token / contract / wallet / market and receive:

- evidence (where the data came from)
- risk (descriptive / review-priority, not "guaranteed")
- confidence (calibrated)
- uncertainty (always explicit)
- a useful deliverable (PDF / report / dashboard) — not just a "case ref"

## Products (from master mission §90 customer-final target)

The 20 customer rows are:

| # | Product |
|---|---|
| 1 | Audit Basic |
| 2 | Audit Pro |
| 3 | Audit Advanced |
| 4 | Browser Basic |
| 5 | Browser Pro |
| 6 | Browser Advanced |
| 7 | Shield Basic |
| 8 | Shield Pro |
| 9 | Shield Advanced |
| 10 | Shield Pro Basic |
| 11 | Shield Pro Pro |
| 12 | Shield Pro Advanced |
| 13 | Real Markets Basic |
| 14 | Real Markets Pro |
| 15 | Real Markets Advanced |
| 16 | Shield Map |
| 17 | Market Impact |
| 18 | Whale Watch |
| 19 | Angel |
| 20 | Risk Indicator |

## Tiers

Basic / Pro / Advanced. Frontend hiding is NOT authorization — separate
verification is mandatory (master mission §32).

## Customer classes (per persona review)

- Beginner retail investor
- Advanced on-chain trader
- Web3 / smart-contract developer
- Security auditor / whitehat
- Memecoin hunter / degen
- Portfolio risk manager
- Compliance / AML officer
- DeFi yield farmer / LP
- Enterprise / institutional
- Lawyer / regulatory counsel
- Plus internal: mobile, multilingual, adversarial, skeptical buyer

## Security philosophy

- Fail-closed when rights are unknown
- Never fake live data
- Never fake customer / reviewer proof
- Tenant isolation mandatory
- AI never claims unavailable facts
- Adversarial testing mandatory
- Authorization separate from UI hiding

## Evidence philosophy

- Every claim has an evidence artifact
- One receipt ≠ many claims (exact correspondence required)
- PROVEN_LOCAL ≠ PROVEN_PRODUCTION
- HISTORICAL_UNTRUSTED until revalidated
- Score is a measurement, never a target

## Data truth philosophy

- REAL_PROVIDER_DATA ≠ LOCAL_CACHE ≠ CUSTOMER_INPUT ≠ SYNTHETIC ≠ AI_SIM
- Never silently upgrade one into another
- "Source unavailable" is honest; fake live is forbidden

## Provider-rights philosophy

For every provider × dataset × field × use case:

| Right | Question |
|---|---|
| Technical access | Can we call it? |
| Source identity | Who supplied the data? |
| Display rights | May Velmère show it? |
| Cache rights | May Velmère store it? |
| Export rights | May Velmère export it? |
| PDF rights | May Velmère put it into PDFs? |
| Commercial rights | May Velmère sell access? |
| Redistribution | May Velmère redistribute it? |
| Attribution | What credit is required? |
| Geo limits | Geographic restrictions? |

Never collapse these into one `provider = PASS`.

## Commercial model

Stop-sell active for Pro/Advanced per Pas 1 inspection of
`config/pass21/provider-commercial-rights-registry.json`. Paid flow not
validated. Free/Basic-only sale path is the current legitimate revenue.

## Current technical architecture (high level)

- Framework: Next.js 16.2.12 (App Router)
- React 19.2.7
- Node 24.18.0, npm 11.16.0 (verified, see 14_CURRENT_STATE)
- TypeScript 5.9.3
- Supabase (URL + keys present in .env.local)
- Stripe (keys MISSING from .env.local — EXTERNAL_BLOCKER)
- Gemini API (key present)
- viem 2.54.6 + wagmi 3.7.3 (Web3 stack)
- next-intl 4.13.0 (i18n EN/PL/DE)
- Zustand (state), TanStack Query (data)
- Tailwind 3.4.19
- Playwright 1.60.0

## Source-of-truth hierarchy

`14_CURRENT_STATE.md` is authoritative for runtime state.
`02_PRODUCTS.md` is authoritative for product capabilities.
`07_PROVIDER_RIGHTS.md` is authoritative for provider permissions.
`15_BLOCKERS.md` is authoritative for what's blocked.
The master prompt is authoritative for what must be done.

## What must NEVER be claimed

- "Production-ready" without PROVEN_PRODUCTION evidence
- "20/20 customer final" without 20 rows of evidence
- "10/10 paid value" without actual paid flow validated
- "Live cloud RLS" without live two-tenant authenticated test
- "Audited / certified / guaranteed" without third-party evidence
- "Real-time / live / accurate" without live provider
- "Independent audit" from a static analyzer

## Permanent invariants

- Stop Guard (`/.agents/hooks/stop-guard.js`) must NEVER be disabled
- `.env.local` must NEVER be committed (gitignore protects it)
- Master prompt (`promptminimax.txt`) must NEVER be replaced by this knowledge
- Knowledge layer is a memory layer, not a new master prompt
- Evidence classifications must NEVER silently upgrade

## Major known risks

- A42 runtime contract (sha256 fingerprint of critical files) blocks dev
  server when files drift from the latest PASS. Current state = ACTION_REQUIRED
  (`VELMERE_ACTIVE_PASS.txt`). Pas 1 reported this.
- Provider data is mostly WITHHELD or UNVERIFIED — most paid features cannot
  show live data.
- 82 unstaged modified files — risk of incomplete fixes drifting from audits
- No GitHub remote — no distributed evidence trail

## Major current blockers

See `15_BLOCKERS.md` for IDs. Summary:

- B-001: Missing CoinGecko API key (Shield/Real Markets)
- B-002: Missing Pyth API key (post-26.08.2026 Hermes requires key)
- B-003: Missing Stripe keys (paid flow)
- B-004: Missing DeFiLlama, TwelveData, admin keys
- B-005: VELMERE_ACTIVE_PASS = ACTION_REQUIRED — dev server blocks
- B-006: No GitHub remote

## Important historical decisions

- Provider rights are NEVER global PASS — see 07_PROVIDER_RIGHTS.md
- Provider branding/logo permission is NOT commercial redistribution right
- Frontend hiding is NOT entitlement enforcement
- AI simulation is NOT external human proof
- Local fixture RLS is NOT live cloud RLS
- "100% exhausted" is forbidden phrasing (master §103)
- All aggregate PASS scripts must be inspected for what they actually test

## Evidence categories used in this repo

See `17_EVIDENCE_INDEX.md` for the searchable list.

## Reread cadence

This file is short by design. Reread at the start of every session.
Long-lived detail lives in the specialized files (01–13, 15–21).