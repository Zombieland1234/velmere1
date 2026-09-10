# VELMÈRE LOCAL FORENSIC REPOSITORY INVENTORY (FURNACE v2)

*Generated at: 2026-09-07T21:02:51.117Z*
*Total Files:* 12815 | *Total Uncompressed Bytes:* 854.79 MB

---

## 1. Environment & Secret Safety Audit
- **Environment Files Inspected:** `.env.local`
- **Server-Side Secret Keys Detected:** 18 (All isolated strictly to Node.js runtime)
- **Public / Publishable Keys:** 8 (Safe for client-side bundle)
- **Unused / Empty Environment Keys:** `GROQ_API_KEY, OPENROUTER_API_KEY`
- **Insecure Client-Side Key Exposure:** **0 DETECTED (PASSED)**
- **Secret Masking Invariant:** All secret keys conform strictly to `sk_...REDACTED` representation in reports and logs.

### Server Secrets Ledger (Masked):
| Key Name | Masked Value | Usage Scope |
|---|---|---|
| `SUPABASE_SECRET_KEY` | `sb_...[REDACTED_LENGTH_41]` | Server-Side Only |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_...[REDACTED_LENGTH_41]` | Server-Side Only |
| `GEMINI_API_KEY` | `AQ....[REDACTED_LENGTH_53]` | Server-Side Only |
| `VELMERE_GEMINI_MODEL` | `gem...[REDACTED_LENGTH_16]` | Server-Side Only |
| `VELMERE_GEMINI_FALLBACK_MODELS` | `gem...[REDACTED_LENGTH_33]` | Server-Side Only |
| `VELMERE_GEMINI_TIMEOUT_MS` | `250...[REDACTED_LENGTH_5]` | Server-Side Only |
| `VELMERE_LENS_SOURCE_TOKEN_SECRET_CURRENT` | `pas...[REDACTED_LENGTH_63]` | Server-Side Only |
| `VELMERE_LENS_RENDER_TOKEN_SECRET_CURRENT` | `pas...[REDACTED_LENGTH_63]` | Server-Side Only |
| `VELMERE_CUSTOMER_REPORT_RENDER_TOKEN_SECRET_CURRENT` | `pas...[REDACTED_LENGTH_57]` | Server-Side Only |
| `VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT` | `pas...[REDACTED_LENGTH_48]` | Server-Side Only |
| `VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT` | `mar...[REDACTED_LENGTH_19]` | Server-Side Only |
| `VELMERE_PROVIDER_RECEIPT_SIGNING_SECRET` | `pas...[REDACTED_LENGTH_53]` | Server-Side Only |
| `VELMERE_LOCAL_PAID_ACCESS_DEMO` | `tru...[REDACTED_LENGTH_4]` | Server-Side Only |
| `ADMIN_IMPORT_TOKEN` | `vel...[REDACTED_LENGTH_47]` | Server-Side Only |
| `GROQ_API_KEY` | `...[REDACTED_LENGTH_0]` | Server-Side Only |
| `OPENROUTER_API_KEY` | `...[REDACTED_LENGTH_0]` | Server-Side Only |
| `STRIPE_SECRET_KEY` | `sk_...[REDACTED_LENGTH_107]` | Server-Side Only |
| `STRIPE_WEBHOOK_SECRET` | `whs...[REDACTED_LENGTH_24]` | Server-Side Only |

---

## 2. Core Dependencies & Frameworks
| Dependency | Version | Role |
|---|---|---|
| `next` | `16.2.12` | App Router Web Framework & API Server |
| `react` / `react-dom` | `19.2.7` | UI Rendering Engine |
| `stripe` | `22.2.0` | Official Stripe Server SDK |
| `@supabase/supabase-js` | `2.108.1` | Database & RLS Client |
| `playwright` | `1.60.0` | Headless Browser Automation & Visual QA |

---

## 3. Application Surfaces & Routing Architecture
| Surface | Route Path | Core React Component | Backend Endpoint Dependencies |
|---|---|---|---|
| **BROWSER** | `/[locale]/browser` | `app/[locale]/browser/page.tsx` | `/api/search, /api/market-integrity/klines` |
| **SHIELD** | `/[locale]/shield` | `app/[locale]/shield/page.tsx` | `/api/security/audits/report` |
| **SHIELD PRO** | `/[locale]/shield-pro` | `app/[locale]/shield-pro/page.tsx` | `/api/security/audits/report, /api/audit/report` |
| **REAL MARKETS** | `/[locale]/real-markets` | `app/[locale]/real-markets/page.tsx` | `/api/market-integrity/klines, /api/market-integrity/quotes` |

---

## 4. Analysis Engines & Security Modules
- **EVM Security Analyzers:** `lib/security/evm-bytecode-analyzer.ts, lib/security/audit-a01-a05-engine.ts`
- **Proxy & Upgradeability Engine:** `lib/security/proxy/proxy-analysis-engine.ts`
- **Oracle & Flash-Loan Engine:** `lib/security/oracle/oracle-risk-engine.ts`
- **Attack Surface Engine:** `lib/security/attack-surface/attack-surface-model.ts`
- **Data Freshness Engine:** `lib/security/freshness/data-freshness-engine.ts`
- **Domain Score Engine:** `lib/security/scoring/domain-score-engine.ts`
- **Remediation Lifecycle Machine:** `lib/security/remediation/remediation-lifecycle.ts`
- **Evidence Replay Engine:** `lib/security/replay/evidence-replay-engine.ts`
- **Asset Class Firewall:** `lib/security/asset-class-firewall.ts`

---

## 5. Stripe Integration & Entitlement Matrix
- **Server Stripe Initializer:** `lib/stripe/server.ts`
- **Webhook Ingress Route:** `app/api/stripe/webhook/route.ts`
- **Webhook Processing Engine:** `lib/payments/stripe-webhook/ingress.ts, lib/payments/stripe-webhook-effect-ledger.ts, lib/payments/stripe-webhook-reconciler.ts`
- **Supported Fiat Currencies:** `USD, EUR, PLN, GBP`
- **Enabled Checkout Methods:** `Cards, Apple Pay, Google Pay, Link, Bancontact, BLIK, EPS, Klarna`
- **Restricted / Pending Methods:** `Cartes Bancaires (Pending), PayPal (Disabled), Revolut Pay (Disabled), iDEAL (Disabled), Przelewy24 (Ineligible), SEPA Direct Debit (Disabled)`

---

## 6. PDF Generation & Visual Traceability
- **Engine:** `lib/security/audit-report-exact-pdf-artifact.ts`
- **PDF Standard:** PDF-1.7 Compliant (Vector typography, cryptographic SHA-256 header stamps)
- **Supported Tiers:** `basic`, `pro`, `advanced`
- **Supported Locales:** `en`, `pl`, `de`
- **Visual Capture Storage:** `artifacts/cycle-XX/screenshots, artifacts/final/screenshots`
