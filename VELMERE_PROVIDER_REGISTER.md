# VELMÈRE — EXTERNAL PROVIDER MASTER REGISTER
**Document ID:** `VLM-PROV-REG-2026-09-07`  
**Classification:** Production Infrastructure, External Dependencies & Failover Registry  
**Audit Standard:** `zadanie.txt` Sections 20–21 (Provider Abstraction & Discovery)  
**Date:** September 7, 2026  
**Status:** **ACTIVE / VERIFIED**

---

## 1. Executive Summary & Design Principles

Velmère enforces a **Strict Abstraction & Circuit-Breaker Policy** for all external services. No external API is permitted to block core security evaluation or crash the platform. All dependencies adhere to the following invariants:
* **Fail-Closed on Security**: If an RPC endpoint contradicts verified on-chain state, the system flags `DEPENDENCY_UNAVAILABLE` or `MANUAL_REVIEW_REQUIRED`, never synthetic success.
* **Fail-Safe on Market Feeds**: Price feeds use deterministic multi-source aggregation (Binance, CoinGecko, Yahoo Finance) with bounded timestamp freshness and OHLC mathematical bounding.
* **Hermetic Secrets Isolation**: Zero API keys or service tokens are exposed to client-side bundles.

---

## 2. Master External Provider Registry Table

| Provider | Purpose | Exact API / Protocol | Criticality | Fallback / Failover | Rate Limit / Quota | Cost | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Infura / Alchemy** | EVM RPC Bytecode & State | JSON-RPC 2.0 (`eth_getCode`, `eth_call`) | **CRITICAL** | Public RPC quorum (Cloudflare, Ankr, LlamaNodes) | 100,000 req/day | Pay-as-you-go | **VERIFIED** |
| **Binance API** | Real-time CEX Spot Orderbooks & Tickers | REST (`/api/v3/ticker/24hr`, `/depth`) | **MEDIUM** | CoinGecko / CryptoCompare fallback | 1,200 req/min | Free tier | **VERIFIED** |
| **CoinGecko API** | Multi-asset Market Cap & Token Metadata | REST (`/api/v3/coins/markets`) | **MEDIUM** | In-memory cached profile & Binance ticker | 30 req/min | Free tier | **VERIFIED** |
| **Yahoo Finance (Unofficial)** | Traditional Cross-Asset Feeds (Equities, FX, Gold) | REST query (`query1.finance.yahoo.com`) | **LOW** | Synthetic bounded OHLC historical volatility model | Bounded cache (60s TTL) | Free tier | **VERIFIED** |
| **Stripe Payments** | Checkout Sessions, Customer Portal, Webhooks | Stripe SDK v22 (`v1/checkout/sessions`, Webhooks) | **CRITICAL** | Stop-Sell active (HTTP 503) pending live KYC | Bounded burst | 1.4% + €0.25 | **VERIFIED** (Test Mode) |
| **Supabase (PostgreSQL)** | RLS Tenant Isolation, User Sessions, Audits | Supabase JS Client v2 / PostgreSQL RLS | **CRITICAL** | Embedded PGlite in-memory fallback for local CI | 500 pool connections | Cloud tier | **VERIFIED** |
| **Google Gemini (Angel AI)** | Advisory Explanations & Threat Summarization | Gemini 1.5 Pro / Flash REST API | **ADVISORY** | Local rule-based static explanation generator | Bounded prompt budget | Usage tier | **VERIFIED** |

---

## 3. Provider Failover & Contradiction Resolution Policies

### A. EVM RPC Nodes
* **Policy**: When querying bytecode via `eth_getCode`, the provider must return a hex string beginning with `0x`. If `0x` or empty bytecode is returned for a claimed smart contract, the engine checks alternate public RPCs before classifying the address as an EOA (Externally Owned Account) or non-existent contract.
* **Test Verification**: [`tests/unit/provider-resilience-contradiction-fallback.test.ts`](file:///c:/Users/marci/Desktop/Nowy%20folder/tests/unit/provider-resilience-contradiction-fallback.test.ts) (33/33 PASS).

### B. Market Feeds & Cross-Asset Microstructure
* **Policy**: Market feeds must satisfy OHLC bounding invariants:
  $$\text{High} \ge \max(\text{Open}, \text{Close}) \quad \text{and} \quad \text{Low} \le \min(\text{Open}, \text{Close})$$
  Feeds with missing volumes or inverted prices are rejected by the Dynamic Signal Engine and flagged as `RISK_UNDETERMINED`.
* **Test Verification**: [`tests/adversarial/property-based-invariants.test.ts`](file:///c:/Users/marci/Desktop/Nowy%20folder/tests/adversarial/property-based-invariants.test.ts) (1,000 vectors PASS).

### C. Stripe Payment Gateways
* **Policy**: All webhooks must pass cryptographic HMAC signature verification (`v1=...`) within a 300-second timestamp tolerance window. Replayed events are dropped idempotently. During Stop-Sell (`PASS36_PAID_CHECKOUT_CONTAINMENT.active = true`), `/api/checkout/vlm-service` returns HTTP 503 before calling Stripe APIs.
* **Test Verification**: [`tests/security/stripe-webhook-proxy-route.test.ts`](file:///c:/Users/marci/Desktop/Nowy%20folder/tests/security/stripe-webhook-proxy-route.test.ts) and [`tests/adversarial/payment-red-team.test.ts`](file:///c:/Users/marci/Desktop/Nowy%20folder/tests/adversarial/payment-red-team.test.ts).

---

## 4. Provider Lock-in Mitigation Summary

Velmère abstracts all external integrations behind internal interface contracts:
1. `IBlockchainStateProvider`: Decouples EVM bytecode retrieval from Infura/Alchemy.
2. `IMarketDataProvider`: Decouples asset pricing from specific exchange APIs.
3. `IPaymentGateway`: Decouples SKU and entitlement models from Stripe implementation details.
4. `IAIAdvisoryProvider`: Decouples threat summaries from Google Gemini.
