# PAS 13 — SHIELD / REAL MARKETS / AUDIT BASIC IMPROVEMENT (M2 §16–18) — RAPORT
Data: 2026-09-02 | Mode: CODE INSPECTION + FALLBACK ANALYSIS

## STATUS: PARTIAL ✓ (fallback infrastructure present, key chains blocked)

---

## 1. Brokered egress — comprehensive profile allow-list

File: `lib/network/brokered-egress.ts`

22 egress profiles with explicit host allow-lists:

| Profile | Hosts | Methods |
|---|---|---|
| `alpha_vantage` | www.alphavantage.co | GET, HEAD |
| `audit_provider_runtime` | api.etherscan.io, api.dexscreener.com, api.gopluslabs.io, api.honeypot.is, api.coingecko.com, sourcify.dev | GET, HEAD |
| `binance_spot` | api.binance.com, api-gcp.binance.com, ... | GET, HEAD |
| `coingecko` | api.coingecko.com | GET, HEAD |
| `defi_llama` | api.llama.fi, pro-api.llama.fi | GET, HEAD |
| `derivatives` | fapi.binance.com, api.bybit.com | GET, HEAD |
| `ecb_statistics` | data-api.ecb.europa.eu | GET, HEAD |
| `dex_screener` | api.dexscreener.com | GET, HEAD |
| `gecko_terminal` | api.geckoterminal.com | GET, HEAD |
| `gemini` | generativelanguage.googleapis.com | POST |
| `goplus` | api.gopluslabs.io | GET, HEAD |
| `market_intelligence` | (multiple) | GET, HEAD, POST |
| `real_markets` | stooq.com, query1.finance.yahoo.com | GET, HEAD |
| `sec_edgar` | data.sec.gov | GET, HEAD |
| `twelve_data` | api.twelvedata.com | GET, HEAD |
| `venue_health` | data-api.binance.vision, api.mexc.com, api.exchange.coinbase.com | GET, HEAD |
| `public_probe` | query1.finance.yahoo.com, api.binance.com | GET, HEAD |
| `pyth_hermes` | pyth.dourolabs.app, hermes.pyth.network | GET, HEAD |
| `printful` | api.printful.com | GET, POST |
| `resend` | api.resend.com | POST |

**All profile hosts are allow-listed** — SSRF protection is built in
per provider.

## 2. Per master mission §16 (M2) — Shield fallback hierarchy

Required:
1. direct on-chain/public reference where applicable
2. Chainlink/Pyth if allowed
3. CoinGecko if correctly licensed/configured
4. other permitted adapters
5. internal deterministic risk analysis

**Status**:
- Layer 1 (direct on-chain): code present (alchemy/quicknode in registry)
- Layer 2 (Pyth): code present (pyth_hermes profile + pyth-price-provider.ts)
- Layer 3 (CoinGecko): code present, missing key (B-001)
- Layer 4 (other): DeFiLlama, Twelve Data, Binance all in code
- Layer 5 (internal): deterministic analysis exists

**Blocker**: layer 3 (CoinGecko) cannot serve live data without B-001.
Without it, layers 1, 2, 4 may still serve partial data depending on keys.

## 3. Per master mission §18 (M2) — Audit Basic minimum deliverable

Required:
- contract identity ✓ (intake stores case)
- chain ✓ (BSC by default)
- bytecode/source availability — NOT_TESTED live
- ownership/admin clues — NOT_TESTED live
- proxy/implementation detection — NOT_TESTED live
- obvious permissions — NOT_TESTED live
- standard heuristic checks — NOT_TESTED live
- evidence availability — NOT_TESTED live
- missing evidence — NOT_TESTED live
- risk — NOT_TESTED live
- confidence — NOT_TESTED live
- next actions — NOT_TESTED live

**Honest status**: Audit Basic is INTAKE ONLY per Pas 0 review.
The prescreen deliverable work is NOT done in current source.

## 4. Per master mission §17 (M2) — Real Markets reference mode

Required:
- reference catalog ✓ (585 instruments, AAPL/NVDA/etc.)
- reference price ✗ (per Pas 0, "—" / "no data")
- live price ✗ (same)
- live liquidity ✗
- commercial market feed ✗

With reference catalog but no live price, the "useful reference mode"
claim is partially satisfied. The honest copy is good:
"data unavailable", "Source status and verification remain explicit".

## 5. Limitations

- Shield Basic cannot show live data without CoinGecko key (B-001)
- Real Markets same issue + missing Twelve Data key
- Audit Basic deliverable requires code work
- Mobile/a11y not tested (Pas 6 limitation)
- No live workflow test (dev server timeout)

## 6. Self-challenge

| Question | Answer |
|---|---|
| Is fallback hierarchy implemented? | PARTIAL (all 5 layers have code) |
| Is Audit Basic useful? | INTAKE ONLY (per Pas 0 review, not changed) |
| Is Real Markets useful? | CATALOG ONLY (no live data) |
| Is Shield useful? | EMPTY TERMINAL (no live data) |

## 7. Exit criteria check

Exit-criteria: "każdy produkt ma real deliverable (nie 'case reference')"

**PARTIAL**:
- Brokered egress: 22 profiles with allow-lists (SSRF protection)
- Provider code: present for 23 providers
- Product deliverable: most still require live data keys
- B-001 + B-002 + B-003 + B-004 must be resolved for full utility

Honest classification: infrastructure present, blocked on credentials.