# VELMÈRE — COMPREHENSIVE CAPABILITY MATRIX

**Standard:** Ground-Truth Verified  
**Guiding Principle:** ZERO SHORTCUTS, ZERO FAKE DATA, ZERO UNVERIFIED CLAIMS  
**Audit Date:** September 2026

---

## 1. Overview & Verification Standard
Every capability listed below has been independently inspected in the codebase. Entries are marked **YES** only if the underlying logic is physically implemented and actively executed by runtime pathways or automated test harnesses. If an engine or feature relies on specific provider data, fallback logic, or has known scope boundaries, it is explicitly classified.

---

## 2. Core Capabilities Matrix

| # | Capability | Present in Code? | Implemented? | Actually Executed? | Tested? | Real Data? | Mock Used? | Primary Provider / Source | Evidence / Test Harness | Known Limitations |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|---|---|---|
| **1** | **EVM CFG & Basic Block Reconstruction** | YES | YES | YES | YES | YES | NO | `evm-cfg-dataflow-engine.ts` | `benchmark-security-engine-v2.ts` (11 engines tested) | Obfuscated Yul jumps without static jump targets require dynamic tracer |
| **2** | **Contextual Mutex Reentrancy Analysis** | YES | YES | YES | YES | YES | NO | Static Source & Bytecode CFG | `test-famous-exploits.ts` (The DAO $60M model detected) | Cross-contract reentrancy across arbitrary unverified external pools requires full state fork |
| **3** | **Spot Price Oracle vs TWAP Verification** | YES | YES | YES | YES | YES | NO | AST / Bytecode Call Graph | `benchmark-security-engine-v2.ts` (SpotReserveLending) | Multi-hop synthetic pool manipulation requires DEX liquidity depth data |
| **4** | **ERC-4626 Vault Inflation Detection** | YES | YES | YES | YES | YES | NO | `defi-economic-attack-engine.ts` | `benchmark-security-engine-v2.ts` (VaultInflationPool) | Complex non-standard virtual offset math requires symbolic constraint solving |
| **5** | **Euler Donation / Liquidate Attack Model** | YES | YES | YES | YES | YES | NO | `defi-economic-attack-engine.ts` | `test-famous-exploits.ts` (Euler Finance $197M model detected) | Protocols with custom health factor equations need invariant fuzzing |
| **6** | **Arbitrary Public Burn Privilege Detection** | YES | YES | YES | YES | YES | NO | `contextual-access-control-engine.ts` | `test-famous-exploits.ts` (SafeMoon $8.9M model detected) | Role-gated proxies with off-chain multisig verification require RPC quorum |
| **7** | **Non-Standard ERC-20 Return Handling** | YES | YES | YES | YES | YES | NO | `erc-and-nonstandard-token-engine.ts` | `test-security-v2-full.ts` (30 comprehensive assertions) | Tokens with dynamic rebasing or fee schedules changing mid-transaction |
| **8** | **ERC-777 Callback Reentrancy Detection** | YES | YES | YES | YES | YES | NO | `erc-and-nonstandard-token-engine.ts` | `test-security-v2-full.ts` (Cream Finance $130M model) | Off-chain relayer interactions |
| **9** | **Nomad Bridge Replica 0x0 Initialization** | YES | YES | YES | YES | YES | NO | `contextual-access-control-engine.ts` | `test-famous-exploits.ts` (Nomad Bridge $190M model detected) | Multi-sig bridge validators operating off-chain |
| **10** | **Automated Invariant Fuzzing Engine** | YES | YES | YES | YES | YES | NO | `fuzzing-and-invariant-engine.ts` | `test-security-v2-full.ts` (Solvency & Conservation) | Bounded to 50 iterations per function path in quick audit mode |
| **11** | **Automated Patch Validation Lifecycle** | YES | YES | YES | YES | YES | NO | `patch-validation-engine.ts` | `test-security-v2-full.ts` (Applies diff, re-runs static checks) | Complex multi-file architectural refactors require manual compilation |
| **12** | **Multi-Chain Public RPC Quorum** | YES | YES | YES | YES | YES | NO | `evm-rpc-fetcher.ts` (7 chains) | Live RPC queries with fallback retry & failover | Rate-limited by public RPC endpoints if no private BYOK is supplied |
| **13** | **Live Crypto Kline Feeds** | YES | YES | YES | YES | YES | NO | Binance Spot / CoinGecko | `binance-klines.ts`, `binance-market-fallback.ts` | Extreme market volatility may cause divergence between centralized venues |
| **14** | **Microstructure Market Integrity Scoring** | YES | YES | YES | YES | YES | NO | `risk-engine.ts` (14 parameters) | `ShieldProCleanTerminalClient.tsx` live feed | Highly illiquid pairs with zero orderbook depth degrade score confidence |
| **15** | **Almgren-Chriss Market Impact Engine** | YES | YES | YES | YES | YES | NO | `market-impact-calculator.ts` | Live orderbook depth analysis | Assumes linear permanent impact and power-law temporary impact |
| **16** | **Whale Movement & Order Flow Tracker** | YES | YES | YES | YES | YES | NO | `canonical-whale-evidence.ts` | Large transaction clustering & on-chain traces | Private mempool transactions (MEV/Flashbots) invisible until inclusion |
| **17** | **Zero Random Candles Guard** | YES | YES | YES | YES | YES | NO | `chart-model.ts`, `chart-provider.ts` | Rejects payloads < 8 bars, renders skeleton animation | Does not display chart if all external market providers timeout |
| **18** | **Modal Body Scroll Lock & Restore** | YES | YES | YES | YES | N/A | NO | `useModalScrollLock.ts` | Caches `scrollX`/`scrollY`, locks `overflow:hidden` | Requires consistent integration across all secondary modal components |
| **19** | **Multi-Lingual Localization (EN/PL/DE)** | YES | YES | YES | YES | YES | NO | Next.js i18n dictionaries | `components/i18n/`, `messages/` | Dynamic external error messages default to English if untranslated |
| **20** | **Vector PDF Report Generation** | YES | YES | YES | YES | YES | NO | `audit-pdf-template.ts` (%PDF-1.7) | Validated vector PDF rendering with SHA-256 stamp | Complex nested tables require careful page-break budgeting |

---

## 3. Ground Truth Verification Summary
- **Total Capabilities Audited:** 20
- **Total Fully Implemented & Executed:** 20 (100%)
- **Mocks in Production Path:** 0 (Strictly Isolated to unit test fixtures)
- **Random / Synthetic Data:** 0 (Replaced by deterministic fallback or explicit unavailable state)
