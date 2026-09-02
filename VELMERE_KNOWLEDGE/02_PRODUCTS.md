# 02 — PRODUCTS MEMORY

UPDATED: 2026-09-02 | SOURCE: directory scan + Pas 0 review summary
CLASSIFICATION: PROVEN_LOCAL for routes, HISTORICAL_UNTRUSTED for capabilities

This file tracks the 20 customer rows from master mission §90.
Implementation details come from directory scan; full capability validation
is the work of Pas 2.

---

## 1. Audit Basic

| Field | Value |
|---|---|
| ROUTES | /security/audits, /security/audits/pricing, /security/audits/sample |
| CUSTOMER | Anyone wanting an intake for a contract/address audit |
| JOB | Submit a contract/address for analysis |
| INPUT | Contract address (tested USDT 0xdAC17F958D2ee523a2206206994597C13D831ec7 in Pas 0) |
| OUTPUT | Per Pas 0: "case reference" + queue for prescreening. NOT a real analysis deliverable yet. |
| DATA | On-chain + heuristic (per master mission §18 AUDIT BASIC PRESCREEN) |
| LIVE/REFERENCE/SYNTHETIC | UNKNOWN until actually tested |
| TIER | Basic — free |
| EVIDENCE | Per Pas 0: intake OK, deliverable NOT yet provided |
| CUSTOMER LIMITATIONS | Per Pas 0 review: "A completed analysis result or PDF is not yet delivered by this workflow" |
| SECURITY | lib/security/* code present; not yet verified for Audit |
| ENTITLEMENT | Stop-sell active for Pro/Advanced per Pas 0 review |
| PROVIDER DEPENDENCIES | Own RPC + customer-supplied input |
| PDF | Historical: 3-tier × 3-locale generation claim (NOT verified locally) |
| MOBILE | Not verified |
| I18N | EN/PL/DE expected |
| CURRENT STATUS | **INTAKE ONLY** per Pas 0 review |
| KNOWN DEFECTS | No result delivered (per Pas 0) |
| KNOWN BLOCKERS | Need real provider integration for result (Pas 13 work) |
| LAST VERIFIED | 2026-09-02 (Pas 0 review summary) |

## 2. Audit Pro

| Field | Value |
|---|---|
| ROUTES | /security/audits (UI block expected) |
| CUSTOMER | Power user wanting deeper audit |
| JOB | Same intent as Basic, deeper analysis |
| OUTPUT | Per Pas 0: "Not for sale" |
| CURRENT STATUS | **STOP-SELL ACTIVE** |
| KNOWN DEFECTS | None visible — UI is intentionally blocked |
| LAST VERIFIED | 2026-09-02 (Pas 0 review summary) |

## 3. Audit Advanced

| Field | Value |
|---|---|
| ROUTES | /security/audits (UI block expected) |
| CUSTOMER | Enterprise / institutional |
| JOB | Deepest supported analysis |
| OUTPUT | Per Pas 0: "Not for sale" |
| CURRENT STATUS | **STOP-SELL ACTIVE** |
| KNOWN DEFECTS | None visible — UI is intentionally blocked |
| LAST VERIFIED | 2026-09-02 (Pas 0 review summary) |

## 4. Browser Basic

| Field | Value |
|---|---|
| ROUTES | /browser |
| CUSTOMER | Anyone exploring the Web3 universe |
| JOB | Browse / search / discover contracts and tokens |
| CURRENT STATUS | Per Pas 0: HTTP 200, but Playwright crash on navigation (SPA context destroyed) |
| KNOWN DEFECTS | SPA navigation crash (Pas 0 review) |
| KNOWN BLOCKERS | Browser fix is Pas 15 |
| LAST VERIFIED | 2026-09-02 (Pas 0 review summary) |

## 5. Browser Pro

| Field | Value |
|---|---|
| CURRENT STATUS | **STOP-SELL ACTIVE** (per stop-sell pattern) |
| LAST VERIFIED | 2026-09-02 (assumed from pattern) |

## 6. Browser Advanced

| Field | Value |
|---|---|
| CURRENT STATUS | **STOP-SELL ACTIVE** |
| LAST VERIFIED | 2026-09-02 (assumed from pattern) |

## 7. Shield Basic

| Field | Value |
|---|---|
| ROUTES | /shield |
| CUSTOMER | Quick asset risk lookup |
| JOB | See price + risk + evidence for one asset |
| INPUT | Asset search (e.g. "bitcoin" — Pas 0: returned "No instruments match") |
| OUTPUT | Terminal UI; per Pas 0: "INSTRUMENTS — SYNCING", "AVG CHANGE — Source unavailable" |
| DATA | CoinGecko expected (no API key) |
| LIVE/REFERENCE/SYNTHETIC | UNKNOWN — no live data demonstrated |
| CURRENT STATUS | **EMPTY TERMINAL** per Pas 0 review |
| KNOWN BLOCKERS | B-001: missing CoinGecko API key |
| LAST VERIFIED | 2026-09-02 |

## 8. Shield Pro

| Field | Value |
|---|---|
| ROUTES | /shield-pro |
| OUTPUT | Per Pas 0: "SOURCE TEMPORARILY UNAVAILABLE · SHIELD_CUSTOMER_DATA_DELIVERY_UNAVAILABLE" |
| DESCRIPTION VISIBLE | Named sources, Explainable scoring, Manipulation detection, Squeeze analysis |
| CURRENT STATUS | **WITHHELD — UNVERIFIED live data** |
| KNOWN BLOCKERS | B-001 CoinGecko; same provider chain as Shield |
| LAST VERIFIED | 2026-09-02 |

## 9. Shield Advanced

| Field | Value |
|---|---|
| CURRENT STATUS | **STOP-SELL ACTIVE** |
| LAST VERIFIED | 2026-09-02 (assumed from pattern) |

## 10. Shield Pro Basic

| Field | Value |
|---|---|
| CURRENT STATUS | Tier matrix exists in code; UI behavior UNVERIFIED |
| LAST VERIFIED | 2026-09-02 |

## 11. Shield Pro Pro

| Field | Value |
|---|---|
| CURRENT STATUS | Tier matrix exists in code; UI behavior UNVERIFIED |
| LAST VERIFIED | 2026-09-02 |

## 12. Shield Pro Advanced

| Field | Value |
|---|---|
| CURRENT STATUS | Tier matrix exists in code; UI behavior UNVERIFIED |
| LAST VERIFIED | 2026-09-02 |

## 13. Real Markets Basic

| Field | Value |
|---|---|
| ROUTES | /real-markets |
| OUTPUT | Per Pas 0: 585 instruments in catalog (AAPL, NVDA, MSFT, GOOGL, AMZN, SPY, QQQ, commodities, FX, crypto) |
| ALL PRICES | "—" / "no data" |
| COPY | "data unavailable", "Source status and verification remain explicit" |
| CURRENT STATUS | **CATALOG WITH NO LIVE PRICES** |
| KNOWN BLOCKERS | Provider keys missing (CoinGecko, TwelveData) |
| LAST VERIFIED | 2026-09-02 |

## 14. Real Markets Pro

| Field | Value |
|---|---|
| CURRENT STATUS | Tier matrix exists; UI behavior UNVERIFIED |
| LAST VERIFIED | 2026-09-02 |

## 15. Real Markets Advanced

| Field | Value |
|---|---|
| CURRENT STATUS | Tier matrix exists; UI behavior UNVERIFIED |
| LAST VERIFIED | 2026-09-02 |

## 16. Shield Map

| Field | Value |
|---|---|
| ROUTES | /shield-map, /market-integrity/shield-map |
| PURPOSE | Evidence graph (Sources → Facts → Signals → Conflicts → Missing → Confidence → VLM Verdict) per master mission §23 |
| CURRENT STATUS | Routes exist; implementation per master mission §23 expectation NOT verified |
| LAST VERIFIED | 2026-09-02 |

## 17. Market Impact

| Field | Value |
|---|---|
| ROUTES | /market-integrity (and sub-pages) |
| PURPOSE | Market impact simulation / analysis |
| RISK | Per master mission §27: must NOT call simulation "realized result / proven forecast / live prediction / backtest / validated alpha / guaranteed result" |
| CURRENT STATUS | UNVERIFIED — needs inspection in Pas 2 |
| LAST VERIFIED | 2026-09-02 |

## 18. Whale Watch

| Field | Value |
|---|---|
| ROUTES | /market-integrity (and sub-pages) |
| PURPOSE | Track large transfers / flows |
| RISK | Per master mission §28: TRANSFER ≠ SALE ≠ PURCHASE; UNCLASSIFIED for ambiguous |
| CURRENT STATUS | UNVERIFIED |
| LAST VERIFIED | 2026-09-02 |

## 19. Angel

| Field | Value |
|---|---|
| ROUTES | /intelligence |
| PURPOSE | AI assistant (Gemini-backed) |
| BEHAVIOR | Per Pas 0 review: 6/6 adversarial tests passed (prompt injection, system prompt extraction, financial advice, legal advice, DAN jailbreak, merytoryczne) |
| GROUNDING | Per Pas 0: grounding_withheld is overused for conceptual questions (Pas 14 work) |
| CACHE | 5760 mutation suite referenced; not yet inspected |
| CURRENT STATUS | **WORKS but over-withholds** |
| KNOWN DEFECTS | Conceptual questions withheld (per Pas 0 review) |
| KNOWN BLOCKERS | None in Pas 1; tuning is Pas 14 |
| LAST VERIFIED | 2026-09-02 |

## 20. Risk Indicator

| Field | Value |
|---|---|
| PURPOSE | Per master mission §29: descriptive / review-priority / predictive / calibrated |
| RISK | Wording must NOT silently upgrade capability |
| CURRENT STATUS | UNVERIFIED |
| LAST VERIFIED | 2026-09-02 |

---

## Cross-product observations

- Wallet Connect: button present on homepage, infrastructure exists,
  not verified for real connection
- Angel safety: 6/6 adversarial tests passed per Pas 0
- Stop-sell pattern consistently applied for Pro/Advanced tiers
- Free/Basic is the de facto revenue path
- Historical PDF generation: claimed 9 PDFs (3 tiers × 3 locales) per Pas 0

## What Pas 2 will add

- Real test of each product's workflow
- Tier delta evidence (Basic vs Pro vs Advanced)
- Customer outcome mapping
- Tier value justification
- PDF generation per tier × locale

Each product entry will get a full evidence receipt after Pas 2.