# 07 — PROVIDER RIGHTS

UPDATED: 2026-09-02 | SOURCE: config/pass21/provider-commercial-rights-registry.json
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

## Provider rows (initial)

Entries observed during Pas 1 + directory scan. Detailed rights will be
filled by Pas 9.

### Chainlink

| Field | Value |
|---|---|
| Technical access | NOT_IMPLEMENTED as adapter |
| Display | UNVERIFIED |
| Cache | UNVERIFIED |
| Export | UNVERIFIED |
| PDF | UNVERIFIED |
| Commercial | UNVERIFIED (brand/logo permission ≠ commercial license) |
| Redistribution | UNVERIFIED |
| Attribution | Per Chainlink guidelines |
| Geo limits | UNVERIFIED |
| STATUS | UNVERIFIED — NOT integrated |

### Pyth

| Field | Value |
|---|---|
| Technical access | YES — `pyth-price-provider.ts` exists |
| Credential | `PYTH_API_KEY` required for Hermes post-26.08.2026 |
| Source identity | Pyth Network |
| Display | UNVERIFIED |
| Cache | UNVERIFIED |
| Export | UNVERIFIED |
| PDF | UNVERIFIED |
| Commercial | UNVERIFIED |
| Redistribution | UNVERIFIED |
| Model training | UNVERIFIED |
| Contract required | YES (per registry) |
| Evidence | EMPTY (no evidence links yet) |
| STATUS | UNVERIFIED — added in unstaged diff |

### CoinGecko

| Field | Value |
|---|---|
| Technical access | YES — `coingecko.ts` exists |
| Credential | COINGECKO_DEMO_API_KEY or PRO key |
| Keyless mode | Available for dev/prototype (per master mission §5) |
| Source identity | CoinGecko |
| Display | UNVERIFIED (need specific tier) |
| Cache | UNVERIFIED |
| Export | UNVERIFIED |
| PDF | UNVERIFIED |
| Commercial | UNVERIFIED (keyless explicitly positioned for non-commercial) |
| Redistribution | UNVERIFIED |
| STATUS | UNVERIFIED — B-001 missing key |

### DeFiLlama

| Field | Value |
|---|---|
| Technical access | YES — `defillama-adapter.ts` exists |
| Source identity | DeFiLlama |
| ToS | Per master mission §6: copying / scraping / harvesting / commercial exploitation / republication / resale require permission |
| Display | UNVERIFIED |
| Cache | UNVERIFIED |
| Export | UNVERIFIED |
| PDF | UNVERIFIED |
| Commercial | RESTRICTED per their ToS |
| Redistribution | RESTRICTED |
| STATUS | RIGHTS_UNVERIFIED — only use as reference/internal |

### Alpha Vantage

| Field | Value |
|---|---|
| Technical access | YES — `alpha-vantage-provider.ts` exists |
| Credential | ALPHA_VANTAGE_API_KEY required (not in .env.local) |
| Commercial use | UNVERIFIED (free personal ≠ commercial display) |
| STATUS | UNVERIFIED |

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
| Technical access | NOT_PRESENT as adapter |
| Credential | TWELVE_DATA_API_KEY required (not in .env.local) |
| STATUS | NOT_IMPLEMENTED |

### DexScreener

| Field | Value |
|---|---|
| Technical access | NOT_PRESENT |
| STATUS | NOT_IMPLEMENTED — Pas 10 investigation |

### Etherscan / BscScan / Solscan

| Field | Value |
|---|---|
| Technical access | NOT_PRESENT as direct adapters |
| STATUS | NOT_INVESTIGATED — per master mission §8, prefer direct RPC over explorer families |

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

## What Pas 9 will add

For each provider:
- termsVersion
- termsRetrievedAt
- termsHash/archive
- territory
- evidenceLinks
- explicit commercialUse / publicDisplay / authenticatedCustomerDisplay /
  internalNonDisplay / cache / historicalStorage / PDFInclusion /
  customerExport / rawRedistribution / derivedAnalytics / AIInput /
  RAGInput / modelTraining / attribution / correctionRight / retention /
  termination / exitPlan / status / blockers

## What will NEVER be claimed

- "Provider approved" based on API working
- "Provider approved" based on documentation
- "Provider approved" based on brand/logo permission
- "Provider approved" based on someone responding positively
- "Provider approved" based on free API existing
- "Provider approved" based on data being fetchable

Only commercial / display / cache / export / PDF / redistribution rights
established per termsCount.