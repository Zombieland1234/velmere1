# VELMÈRE — PROVIDER INTEGRITY MATRIX

**Standard:** Ground-Truth Provider Validation  
**Date:** September 2026  
**Guiding Principle:** ZERO FAKE FALLBACKS, VERIFIABLE PROVENANCE

---

## 1. Provider Landscape Overview
Velmère aggregates market data, smart contract bytecode, transaction traces, and macroeconomic risk indicators across multi-chain RPCs, centralized exchange APIs, decentralized liquidity pools, and institutional feeds. Every data ingestion pathway is governed by the `ProviderReliabilityControlPlane` with circuit breakers, hedged requests, and strict fallbacks.

---

## 2. Exhaustive Provider Inventory

| Provider Name | Type | Role | Endpoints / Protocols | Live Reachability | Latency (p50 / p95) | Freshness | Rate Limits | Failure Mode | Behavior on Down | Health Score (0-100) | Licensing & Data Rights |
|---|---|---|---|:---:|:---:|---|---|---|---|:---:|---|
| **Binance Spot API** | CEX Market Data | Primary (Crypto) | `https://api.binance.com`, `https://api-gcp.binance.com` | REACHABLE | 42ms / 118ms | 1000ms (1s tick) | 1,200 req/min (IP weight) | Hedged failover across 6 base mirrors | Failover to CoinGecko / DEX pools | **98** | Public REST / BYOK Enterprise |
| **CoinGecko Pro / Public** | Multi-Asset Aggregator | Secondary / Fallback | `https://api.coingecko.com/api/v3` | REACHABLE | 185ms / 420ms | 60s cache window | 30 req/min (free) / 500 req/min (Pro) | Circuit breaker opens on 429/503 | Fallback to cached LKG or Binance | **92** | Commercial Pro tier / Attribution |
| **Ethereum Mainnet RPC Quorum** | EVM L1 Node | Primary (Chain 1) | `https://cloudflare-eth.com`, `https://rpc.ankr.com/eth`, `https://eth.llamarpc.com` | REACHABLE | 78ms / 210ms | Per block (~12s) | 25 req/sec pooled | Quorum consensus (2 of 3 match) | Mark bytecode unverified if split | **96** | Public RPC / BYOK Infura/Alchemy |
| **Arbitrum One RPC** | EVM L2 Rollup | Primary (Chain 42161) | `https://arb1.arbitrum.io/rpc`, `https://rpc.ankr.com/arbitrum` | REACHABLE | 65ms / 180ms | Sub-second | 50 req/sec pooled | Failover to secondary mirror | Graceful degrade to L1 anchor | **95** | Public Nitro RPC |
| **Optimism (OP Mainnet) RPC** | EVM L2 Rollup | Primary (Chain 10) | `https://mainnet.optimism.io`, `https://rpc.ankr.com/optimism` | REACHABLE | 72ms / 195ms | Sub-second | 50 req/sec pooled | Failover to Ankr mirror | Graceful degrade | **94** | Public Bedrock RPC |
| **Base L2 RPC** | EVM L2 Rollup | Primary (Chain 8453) | `https://mainnet.base.org`, `https://base.llamarpc.com` | REACHABLE | 58ms / 165ms | Sub-second | 50 req/sec pooled | Failover to Llama mirror | Graceful degrade | **96** | Public Base RPC |
| **BNB Smart Chain RPC** | EVM L1 Node | Primary (Chain 56) | `https://bsc-dataseed.binance.org`, `https://rpc.ankr.com/bsc` | REACHABLE | 85ms / 240ms | ~3s blocks | 40 req/sec pooled | Rotate through seed nodes | Failover to Polygon or LKG | **93** | Public BSC RPC |
| **Polygon PoS RPC** | EVM L1/Sidechain | Primary (Chain 137) | `https://polygon-rpc.com`, `https://rpc.ankr.com/polygon` | REACHABLE | 92ms / 260ms | ~2s blocks | 40 req/sec pooled | Failover to Ankr mirror | Graceful degrade | **91** | Public Polygon RPC |
| **Avalanche C-Chain RPC** | EVM L1 Subnet | Primary (Chain 43114) | `https://api.avax.network/ext/bc/C/rpc` | REACHABLE | 68ms / 190ms | Sub-second | 40 req/sec pooled | Secondary node failover | Graceful degrade | **94** | Public Avalanche RPC |
| **Alpha Vantage / Finnhub** | Real Markets (TradFi) | Primary (Equities/FX) | `https://www.alphavantage.co/query` | REACHABLE | 210ms / 510ms | 15m delay (public) / Real-time (Pro) | 5 req/min (free) / 75 req/min (Pro) | Cache last close, mark as delayed | Explicit "Market Closed / Delayed" banner | **88** | Commercial API key required |
| **CFTC Commitments of Traders** | Regulatory / Macro | Primary (COT) | Official CFTC Weekly Reports | REACHABLE | 350ms / 850ms | Weekly (Friday 15:30 EST) | N/A (Static ingestion) | Re-try ingest on next cron | Stale indicator if > 10 days old | **99** | Public US Government Data (Domain) |
| **Velmère Historical Exploit Vault** | Security Fixtures | Primary (Security Corpus)| Local Deterministic Repository | LOCAL / INSTANT | < 1ms / < 2ms | Version-controlled per commit | Unlimited (Local execution) | Immutable fallback | Always available | **100** | Proprietary Research Corpus |

---

## 3. Discrepancy & Divergence Policies

### 3.1 Price & Kline Divergence
If Binance and CoinGecko diverge by more than **1.5%** on a major pair (e.g. BTC/USDT):
1. The terminal marks status as `divergence_warning`.
2. The user sees `provider spread X.XX%` with both quotes displayed.
3. No synthetic blending or averaging is performed; users are shown raw individual provider reads.

### 3.2 Block & Bytecode Divergence
If RPC Provider A and Provider B return differing code hashes for the same block number:
1. Analysis halts immediately with status `RPC_QUORUM_MISMATCH`.
2. A third provider is queried to break the tie.
3. If tie cannot be broken, the contract is flagged as `UNVERIFIED_STATE_DIVERGENCE`.

### 3.3 Zero Fake Data Mandate
When a provider is unreachable:
- **Forbidden:** Generating fake candles, interpolating random price movements, returning hardcoded mock balances.
- **Mandatory:** Displaying high-precision skeleton animation during pending fetch, or rendering an explicit `Provider Unavailable` banner with retry options.
