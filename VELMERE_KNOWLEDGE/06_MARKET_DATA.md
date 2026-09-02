# 06 — MARKET DATA

UPDATED: 2026-09-02 | CLASSIFICATION: PROVEN_LOCAL (code presence), UNKNOWN (live data)

## Adapters found in `lib/market-integrity/`

| Adapter | File |
|---|---|
| CoinGecko | coingecko.ts |
| Pyth | pyth-price-provider.ts |
| Alpha Vantage | alpha-vantage-provider.ts (+ pass459 variant) |
| Binance (klines) | binance-klines.ts |
| Binance (orderbook) | binance-orderbook.ts |
| Binance (market fallback) | binance-market-fallback.ts |
| DeFiLlama | defillama-adapter.ts + defillama-expansion.ts |
| Fulfilment providers | lib/providers/provider-sandbox-fulfilment.ts + fulfilment-provider-contract.ts |
| Brokered egress | lib/network/brokered-egress.ts |
| API guardrails | lib/market-integrity/api-guardrails.ts |

## Provider technical access per source

| Source | Technical access | API key required | Status |
|---|---|---|---|
| CoinGecko | Code present | YES (Demo/Pro) | B-001 missing |
| Pyth Hermes | Code present | YES (post-26.08.2026) | B-002 missing |
| Alpha Vantage | Code present | YES | UNKNOWN if configured |
| Binance | Code present | NO (public endpoints) | UNKNOWN — never tested live |
| DeFiLlama | Code present | UNKNOWN | UNKNOWN |
| Twelve Data | NOT FOUND as adapter | YES | NOT_INVESTIGATED |
| Chainlink | NOT FOUND as adapter | YES | NOT_IMPLEMENTED (per Pas 0 review) |
| DexScreener | NOT FOUND | — | NOT_IMPLEMENTED |
| Etherscan/BscScan/Solscan | NOT FOUND as direct adapters | YES | NOT_INVESTIGATED |
| Arkham | NOT FOUND | YES | NOT_IMPLEMENTED |
| Blockaid | NOT FOUND | YES | NOT_IMPLEMENTED |
| RWA.xyz | NOT FOUND | YES | NOT_IMPLEMENTED |
| Own RPC | UNKNOWN (lib/web3/ + lib/wallet/ exist) | NO | UNKNOWN |

## Display vs cache vs export vs PDF vs commercial (initial)

For each provider the rights are tracked per use case in `07_PROVIDER_RIGHTS.md`.

## Real Markets catalog (per Pas 0 review)

585 instruments claimed:
- Equities: AAPL, NVDA, MSFT, GOOGL, AMZN
- ETFs: SPY, QQQ
- Commodities
- FX
- Crypto

Catalog count: PROVEN_LOCAL (route exists), content verification pending.

## Provider rights matrix high-level summary

(PROVEN_LOCAL where filled; UNKNOWN elsewhere)

| Provider | Tech | Display | Cache | Export | PDF | Commercial |
|---|---|---|---|---|---|---|
| CoinGecko | YES | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| Pyth | YES | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED (per registry) |
| Alpha Vantage | YES | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| Binance | YES (public) | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| DeFiLlama | YES | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | RESTRICTED (per ToS) |
| Twelve Data | NOT_PRESENT | — | — | — | — | — |
| Chainlink | NOT_PRESENT | — | — | — | — | — |
| DexScreener | NOT_PRESENT | — | — | — | — | — |
| Etherscan family | NOT_PRESENT | — | — | — | — | — |
| Arkham | NOT_PRESENT | — | — | — | — | — |
| Blockaid | NOT_PRESENT | — | — | — | — | — |
| RWA.xyz | NOT_PRESENT | — | — | — | — | — |
| Own RPC | UNKNOWN | YES | YES | UNVERIFIED | YES | UNKNOWN |

## Differentiation

Per master mission §15 (M2): MULTIPLE endpoints from one provider do NOT
equal independent sources. Etherscan + BscScan + Solscan together = one
explorer family, not three.

## What Pas 9 + Pas 10 + Pas 13 will add

- Full provider-by-provider rights verdict
- Live data test for each provider with key
- Fallback chain test
- Source quorum test (primary + secondary + on-chain + internal)
- Stale source detection
- Rights-blocked source detection
- Commercial rights separate from technical access per provider
- Display / cache / export / PDF rights separate

## Staleness rule

Per master mission §68: every receipt needs timestamp + HEAD + runtime +
command + artifact + test result. Materially changed code can invalidate
old evidence. Pas 9 will mark stale evidence explicitly.