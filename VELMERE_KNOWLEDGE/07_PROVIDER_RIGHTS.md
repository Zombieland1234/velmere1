# 07 — PROVIDER RIGHTS

UPDATED: 2026-09-03 | SOURCE: config/pass21/provider-commercial-rights-registry.json
CLASSIFICATION: PROVEN_LOCAL for registry file content, UNVERIFIED for rights

## Critical principle (master mission §13, M2)

Per provider × dataset × field × use case:

| Right | Question |
|---|---|
| Technical access | Can we call it? |
| Source identity | Who supplied? |
| Display rights | May Velmère show it? |
| Cache rights | May Velmère store it? |
| Export rights | May Velmère export it? |
| PDF rights | May Velmère put it into PDFs? |
| Commercial rights | May Velmère sell access? |
| Redistribution | May Velmère redistribute it? |
| Attribution | What credit? |
| Geo limits | Geographic? |

The same provider may be:

```
UI = allowed
PDF = blocked
export = blocked
AI input = allowed
raw redistribution = blocked
```

That is expected. Never collapse into one global PASS.

## Registry file

Location: `config/pass21/provider-commercial-rights-registry.json`

This file is the canonical rights record. It is updated when a new
provider is added (Pas 1 saw Pyth added with `rightsState: UNVERIFIED`).
On 2026-09-03 the registry was extended with `tiersObserved` and
`useCaseMatrix` for: Chainlink, CoinGecko, Twelve Data, Pyth, DeFiLlama,
Etherscan, Alpha Vantage.

## Per-tier, per-use-case rule (CRITICAL)

A provider's commercial rights MUST be evaluated per plan/tier × per
use case. The same provider can have several tiers with different
rights (e.g. CoinGecko keyless vs Basic/Analyst/Lite/Pro; Twelve Data
Individual vs Business). And within a given plan, UI display, PDF
inclusion, cache, AI/RAG input, raw redistribution, and model training
are SEPARATE rights that must each be evaluated.

The registry encodes this with two structures:

* `tiersObserved` — observed plans/tiers with their scope
* `useCaseMatrix` — per use case, which tiers allow it, and whether it
  is active in Velmère today

If a use case is not explicitly allowed under a tier, it is
UNVERIFIED. UNVERIFIED ≠ allowed.

## Per-provider status (current registry)

### Chainlink

| Field | Value |
|---|---|
| Technical access | NOT_INTEGRATED (no adapter; public docs exist) |
| Display | UNVERIFIED |
| Cache | UNVERIFIED |
| Export | UNVERIFIED |
| PDF | UNVERIFIED |
| Commercial | UNVERIFIED — brand/logo permission ≠ commercial data license |
| Redistribution | UNVERIFIED |
| Brand evidence | positive response on logo/brand usage + Data Feeds documentation; NO commercial redistribution license on file |
| DataLink note | Chainlink's own DataLink product is built around permissioned commercialization → this confirms access ≠ licensing |
| STATUS | RIGHTS_UNVERIFIED_DESPITE_BRAND_RESPONSE — NOT integrated |

CRITICAL: Until the actual email/message from Chainlink is located in
the repository, parsed literally, and stored as evidence, do NOT
expand the brand/brand-usage response into a commercial redistribution
right. The message, when found, must be used only for exactly what it
says.

### Pyth

| Field | Value |
|---|---|
| Technical access | YES — `pyth-price-provider.ts` exists |
| Credential | `PYTH_API_KEY` required for Hermes post-2026-08-26 |
| Source identity | Pyth Network |
| Display | UNVERIFIED (per-tier) |
| Cache | UNVERIFIED |
| Export | UNVERIFIED |
| PDF | UNVERIFIED |
| Commercial | UNVERIFIED_PER_PLAN |
| Redistribution | UNVERIFIED |
| Model training | UNVERIFIED |
| Contract required | YES |
| Evidence | Empty — Hermes API key requirement snapshot only |
| STATUS | RIGHTS_UNVERIFIED_PER_PLAN — commercial scope must be checked per Pyth product/API for the specific Velmère use case |

### CoinGecko

| Field | Value |
|---|---|
| Technical access | YES — `coingecko.ts` exists |
| Credential | COINGECKO_DEMO_API_KEY or PRO key |
| Keyless mode | Available for dev/prototype ONLY (non-commercial) |
| Tier A — Keyless public API | non-commercial, no paid product, no display, no PDF, no cache |
| Tier B — Basic / Analyst / Lite / Pro (Standard Commercial License) | commercial use YES, display YES, derived analytics YES, PDF YES, cache YES, raw API resale/sublicensing/redistribution NO, attribution "Data provided by CoinGecko" + link REQUIRED |
| Tier C — Custom / Enterprise | required for raw redistribution / resale / sublicensing |
| STATUS | PARTIAL_PER_USE_CASE — Tier B is sufficient for paid-product use of CoinGecko data, but NOT for raw-feed redistribution; Tier A is NEVER commercial |

Velmère implication: on a Standard Commercial License, Velmère may
build a paid product that displays CoinGecko data to its customers
and includes it in PDFs (with attribution). Velmère may NOT resell
the raw API/data access to customers under Tier B.

### DeFiLlama

| Field | Value |
|---|---|
| Technical access | YES — `defillama-adapter.ts` exists |
| Source identity | DeFiLlama |
| ToS | Standard public API is personal/non-commercial; commercial copying, scraping, republishing, resale require prior written permission |
| Display | UNVERIFIED for commercial use |
| Cache | UNVERIFIED for commercial use |
| Export | UNVERIFIED |
| PDF | UNVERIFIED |
| Commercial | RESTRICTED per ToS |
| Redistribution | RESTRICTED |
| STATUS | RIGHTS_RESTRICTED — only use as internal reference until a specific written permission is attached |

### Alpha Vantage

| Field | Value |
|---|---|
| Technical access | YES — `alpha-vantage-provider.ts` exists |
| Credential | ALPHA_VANTAGE_API_KEY required (not in .env.local) |
| Free key | personal/non-commercial; NOT commercial display permission |
| Commercial use | UNVERIFIED — requires sales contact + signed agreement |
| Realtime / 15-min US data | requires additional licensing/regulatory review |
| STATUS | RIGHTS_RESTRICTED_FOR_COMMERCIAL |

### Binance

| Field | Value |
|---|---|
| Technical access | YES — public endpoints via 3 adapter files |
| Source identity | Binance |
| Display | UNVERIFIED (Binance ToS restricts commercial display) |
| Cache | UNVERIFIED |
| Export | UNVERIFIED |
| PDF | UNVERIFIED |
| Commercial | UNVERIFIED |
| STATUS | UNVERIFIED — never tested live |

### Twelve Data

| Field | Value |
|---|---|
| Technical access | YES — present as adapter |
| Credential | TWELVE_DATA_API_KEY required (not in .env.local) |
| Tier A — Individual Basic/Grow/Pro/Ultra | personal / internal / non-production; NO commercial third-party display |
| Tier B — Business Venture / Enterprise / Enterprise+ | commercial display YES; raw API redistribution still requires separate agreement |
| STATUS | PARTIAL_PER_USE_CASE — Tier A must NEVER be wired into a paid public-facing surface; Tier B permits display but not raw redistribution |

### DexScreener

| Field | Value |
|---|---|
| Technical access | NOT_PRESENT |
| STATUS | NOT_IMPLEMENTED — Pas 10 investigation |

### Etherscan / BscScan / Solscan

| Field | Value |
|---|---|
| Technical access | NOT_PRESENT as direct adapters |
| Free tier | non-commercial |
| Paid production | commercial allowed UNVERIFIED (depends on plan) |
| Redistribution | typically requires separate written permission |
| STATUS | NOT_INVESTIGATED — per master mission §8, prefer direct RPC over explorer families for the audit core |

### Arkham

| Field | Value |
|---|---|
| Technical access | NOT_PRESENT |
| STATUS | NOT_IMPLEMENTED |

### Blockaid

| Field | Value |
|---|---|
| Technical access | NOT_PRESENT |
| STATUS | NOT_IMPLEMENTED — optional |

### RWA.xyz

| Field | Value |
|---|---|
| Technical access | NOT_PRESENT |
| STATUS | NOT_IMPLEMENTED — for RWA Evidence Passport |

### Own RPC / self-hosted

| Field | Value |
|---|---|
| Technical access | UNKNOWN (lib/web3/ + lib/wallet/ exist) |
| Commercial | YES (own infrastructure) |
| Redistribution | YES (own data) |
| STATUS | UNKNOWN — Pas 10 inspection needed |

## What is NEVER a basis for commercial approval

- "Provider approved" based on API working
- "Provider approved" based on documentation
- "Provider approved" based on brand/logo permission
- "Provider approved" based on someone responding positively
- "Provider approved" based on free API existing
- "Provider approved" based on data being fetchable
- "Provider approved" based on a public API endpoint returning data

Only commercial / display / cache / export / PDF / redistribution rights
established per tier × per use case, with terms snapshot + evidence
hash, count.

## Chainlink evidence handling protocol

The relevant email/message from Chainlink that was discussed in prior
sessions has NOT been located in the repository as of 2026-09-03. The
protocol is:

1. Locate the artifact (email file, message log, screenshot, signed
   letter, etc.) inside the repository.
2. Read it literally. Quote the operative phrases. Compute a
   sha256 of the artifact and store it in the registry `evidence`
   array as `{ "type": "literal_email", "label": "...",
   "retrievedAt": "2026-09-03", "literalQuote": "...",
   "scope": "exactly what the email says", "doNotExpandTo":
   "anything beyond that scope", "sha256": "..." }`.
3. Map the quote to the `useCaseMatrix` cells. Cells that are
   explicitly allowed by the quote may flip from UNVERIFIED to a
   specific tier. All other cells remain UNVERIFIED.
4. Do NOT derive "general commercial redistribution rights" from a
   logo/brand-usage response. The message either grants a specific
   right, or it doesn't.

Until step 1 produces a located artifact, Chainlink's commercial
rights remain `RIGHTS_UNVERIFIED_DESPITE_BRAND_RESPONSE`.
