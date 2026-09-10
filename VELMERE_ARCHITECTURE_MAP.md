# VELMÈRE — COMPREHENSIVE ARCHITECTURE & DEPENDENCY MAP

**Document ID:** `VELMERE-ARCH-MAP-2026-09-07`  
**Classification:** Institutional Architecture Specification  
**Authority:** Principal Software Architect & Principal Security Engineer  

---

## 1. System Pipeline Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Next.js 16)                       │
│  - Public Web (Home, Markets, Shield, Intelligence, Pricing)           │
│  - Customer Portal (Account, Audits, Billing, Security Disclosures)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (TLS 1.3) + CSP + CORS
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        AUTH & SESSION BOUNDARY                         │
│  - Supabase Auth (JWT + PKCE) + Cookie Session Engine                  │
│  - Role / Entitlement Decoupling (basic, pro, advanced)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Authenticated Request Context
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         API & INGRESS GATEWAY                          │
│  - Next.js Edge & Node API Routes (/api/...)                           │
│  - Rate Limiting (Token Bucket / Upstash Redis)                        │
│  - Asset-Class Firewall Dispatcher (Quarantines non-EVM from EVM AST)  │
└──────────────────┬────────────────┬───────────────────┬────────────────┘
                   │                │                   │
                   ▼                ▼                   ▼
┌─────────────────────────┐ ┌───────────────┐ ┌──────────────────────────┐
│      COMMERCE ENGINE    │ │   AI ADVISOR  │ │   INTELLIGENCE ENGINE    │
│ - Authoritative SKU Cat │ │ - Gemini 2.5  │ │ - EVM AST & Bytecode     │
│ - Stripe Checkout API   │ │ - Tool Calls  │ │ - Market Data Feeds      │
│ - Stop-Sell Containment │ │ - Strict JSON │ │ - OHLC Technical Bounds  │
│ - Webhook Idempotency   │ │ - NIST Bound  │ │ - 8-State Status Enum    │
└────────────┬────────────┘ └───────┬───────┘ └─────────────┬────────────┘
             │                      │                       │
             ▼                      ▼                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   CANONICAL REPORT ASSEMBLY PIPELINE                   │
│  - Aggregates findings with SHA-256 evidence digests                   │
│  - Filters locked tiers (Pro/Advanced data: null for Basic)            │
│  - Enforces Pre-Flight Semantic Linter (9 Invariants)                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Verified Canonical Report
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   DETERMINISTIC PDF-1.4 RENDERER                       │
│  - Zero synthetic addresses / customer-safe output                     │
│  - Embeds cryptographic SHA-256 plan & payload digests                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Inventory & Operational Attributes

| Subsystem Component | Operational Owner | Source of Truth | Trust Level | Failure Mode | Security Boundary | Primary Dependencies | Fallback Strategy | Test Coverage | Production Status |
|---|---|---|---|---|---|---|---|---|---|
| **Client Frontend** | Frontend Team | `app/[locale]/...` | Untrusted | Graceful error boundary + retry UI | Browser sandbox | Next.js 16, React 19, Tailwind CSS | Cached offline layout | E2E Playwright | **LIVE / VERIFIED** |
| **Auth & Session** | Security Eng | Supabase Auth + JWT cookies | Semi-Trusted | Reject unauthenticated | HTTP-only Secure SameSite cookies | Supabase Auth API | Local session state | Unit / Integration | **LIVE / VERIFIED** |
| **Asset-Class Firewall** | Security Eng | `lib/security/asset-class-firewall.ts` | Authoritative | Fail-closed (`AssetFirewallViolationError`) | Server boundary | Static domain classifier | Deny execution | `asset-class-firewall.test.ts` | **LIVE / VERIFIED** |
| **Status Contract** | Data Integrity | `lib/security/status-contract.ts` | Authoritative | Returns `RISK_UNDETERMINED` on low coverage | Scoring boundary | 8-State typed enum | Risk undetermined | `check-status-invariants.test.ts` | **LIVE / VERIFIED** |
| **EVM Static Analyzer** | Security Eng | `lib/security/audit-canonical-report.ts` | Authoritative | Marks finding `UNVERIFIED` on AST error | Engine boundary | Archive RPC nodes, Viem | Secondary RPC quorum | `golden-security-corpus.test.ts` | **LIVE / VERIFIED** |
| **Market Data Feeds** | Quant Eng | `lib/market/...` | External Untrusted | Marks stale (>300s) | Data normalization | Binance, TwelveData, AlphaVantage | Secondary feed fallback | `property-based-invariants.test.ts` | **LIVE / VERIFIED** |
| **AI Advisor (Angel)** | AI Research | `lib/ai/angel.ts` | Advisory Only | Fails closed to deterministic rules | LLM sandboxed schema | Google Gemini API | Deterministic static advice | AI security harness | **LIVE / VERIFIED** |
| **Commercial SKU Authority**| Billing Eng | `lib/commerce/vlm-paid-access.ts` | Authoritative | Rejects unknown SKU / tampered price | Server-side billing | Server SKU catalog | Reject transaction | `payment-red-team.test.ts` | **LIVE / VERIFIED** |
| **Checkout Containment** | Release Reviewer| `lib/commerce/vlm-paid-checkout-containment.ts`| Authoritative | HTTP 503 Stop-Sell | Commerce ingress | Hard containment flag | 503 Service Unavailable | `payment-red-team.test.ts` | **ACTIVE (CONTAINED)** |
| **Stripe Webhook Gateway**| Billing Eng | `lib/payments/stripe-webhook/...` | Authoritative | Rejects unverified HMAC, deduplicates | Webhook signature gate | Stripe API, webhook secrets | Reject forged event | `payment-red-team.test.ts` | **LIVE / VERIFIED** |
| **Semantic Report Linter** | Compliance Lead| `lib/security/report-semantic-linter.ts` | Authoritative | Halts PDF generation on violation | Pre-render gate | 9 Invariant rules | Block report emission | `report-semantic-linter.test.ts` | **LIVE / VERIFIED** |
| **PDF-1.4 Generator** | Document Eng | `scripts/generate_50_production_pdfs.ts` | Deterministic | Fails closed on malformed model | Generation boundary | Node.js Buffer / zlib stream | None | 50 canonical PDF manifest | **LIVE / VERIFIED** |

---

## 3. Trust Boundaries & Security Classifications

1. **Client / Browser Boundary:** All incoming client requests (HTTP query params, JSON bodies, cookies) are treated as hostile and untrusted.
2. **Server-Side SKU Authority:** Prices, currencies, product definitions, and entitlement tiers are hardcoded and immutable on the server. No client-supplied price or entitlement level is ever accepted.
3. **External Data Provider Boundary:** All third-party market data feeds (crypto exchanges, equities quotes) and blockchain RPCs are treated as unauthenticated external inputs subjected to bounded validation (OHLC invariants, staleness watchdogs).
4. **AI Generation Boundary:** AI model outputs are strictly advisory. AI cannot authorize payments, elevate user tiers, bypass security checks, or sign off on release gates.
