# 01 — ARCHITECTURE MEMORY

UPDATED: 2026-09-02 | SOURCE: directory scan + key files | CLASSIFICATION: PROVEN_LOCAL

## Stack

| Component | Value | Source |
|---|---|---|
| Framework | Next.js 16.2.12 (App Router) | package.json |
| React | 19.2.7 | package.json |
| Node | 24.18.0 (≥24.18.0 <25) | .nvmrc, engines |
| npm | 11.16.0 | packageManager, engines |
| TypeScript | 5.9.3 | package.json devDependencies |
| i18n | next-intl 4.13.0 (EN/PL/DE) | package.json |
| State | Zustand 4.5.7 | package.json |
| Data | TanStack Query 5.101.0 + SWR 2.4.1 | package.json |
| Web3 | viem 2.54.6, wagmi 3.7.3, WalletConnect 2.23.9 | package.json |
| Payment | Stripe 22.2.0 + @stripe/stripe-js 7.9.0 | package.json |
| DB client | @supabase/supabase-js 2.108.1 | package.json |
| AI | Gemini (server-side) | package.json devDeps, .env.local |
| Styling | Tailwind 3.4.19 | package.json |
| Testing | Playwright 1.60.0, Vitest not used (no @vitest in deps) | package.json |
| 3D / motion | three 0.184.0, framer-motion 12.40.0 | package.json |
| Schema | zod 3.25.76 | package.json |
| Local DB (dev) | @electric-sql/pglite 0.5.4 (dev) | package.json devDeps |

## Directory structure

```
velmere-store/
├── .agents/                  — agent hooks (incl. stop-guard.js)
│   ├── hooks.json            — registers stop-guard
│   └── hooks/stop-guard.js   — 168 lines, controls termination
├── .github/                  — GitHub workflows (untouched in Pas 1)
├── app/                      — Next.js App Router pages (185 files)
│   ├── [locale]/             — i18n-routed customer pages
│   │   ├── security/audits/  — Audit Basic/Pro/Advanced customer flows
│   │   ├── shield/           — Shield Basic
│   │   ├── shield-pro/       — Shield Pro
│   │   ├── shield-map/       — Shield Map
│   │   ├── real-markets/     — Real Markets
│   │   ├── market-integrity/ — Market Impact, Whale Watch
│   │   ├── browser/          — Browser
│   │   ├── intelligence/     — Angel/Risk Indicator
│   │   ├── admin/            — admin routes
│   │   ├── checkout/         — payments
│   │   └── account/          — user account
│   ├── api/                  — API routes (untouched in Pas 1)
│   ├── proof/                — proof page
│   └── styles/               — CSS
├── components/               — React components (172 files)
├── lib/                      — business logic (1640 files, 40+ subsystems)
├── messages/                 — i18n message files
├── public/                   — static assets
├── store/                    — Zustand stores
├── db/                       — raw SQL
├── supabase/
│   ├── functions/            — Edge Functions
│   └── migrations/           — 135 SQL migrations
├── scripts/                  — 79 script subdirectories
│   ├── pass15..pass36        — verification passes
│   ├── a34..a97              — acceptance scripts
│   ├── deployment/           — build / smoke / preflight
│   ├── runtime-config/       — runtime contract verification
│   ├── preflight/            — pre-build checks
│   └── lib/                  — shared helpers
├── tests/                    — Playwright E2E + deep-customers
├── artifacts/                — receipts, manifests, dashboards
├── config/                   — configuration (pass14..pass36, closure)
├── data/, fixtures/, docs/   — supporting content
├── evaluation/               — AI eval
├── receipts/                 — historical receipts
└── reports/                      — session reports (NEW, this session)
```

## lib/ subsystem map (40+ directories)

Notable subsystems (selected, not exhaustive):

| Dir | Purpose |
|---|---|
| lib/security/ | API guard, edge boundary, durable rate limit, secret handling |
| lib/network/ | brokered-egress (provider call abstraction) |
| lib/providers/ | provider-sandbox-fulfilment, fulfilment-provider-contract |
| lib/ai/ | (empty as directory — AI code is in lib/market-integrity/) |
| lib/market-integrity/ | 1400+ files; the heart of market / risk / provider / Angel code |
| ├── coingecko.ts | CoinGecko adapter |
| ├── pyth-price-provider.ts | Pyth adapter |
| ├── alpha-vantage-provider.ts | Alpha Vantage adapter |
| ├── binance-klines.ts / binance-orderbook.ts / binance-market-fallback.ts | Binance adapters |
| ├── defillama-adapter.ts / defillama-expansion.ts | DeFiLlama adapters |
| ├── angel-provider-gateway.ts | Angel AI gateway |
| ├── ai-orchestrator.ts / ai-risk-bot.ts | AI orchestration |
| └── … | many more (e.g. ai-human-copy-engine, alpha-vantage-provider) |
| lib/intelligence/ | intelligence content + flagship + decision support |
| lib/payments/ | Stripe payment logic |
| lib/checkout/ | checkout flow |
| lib/stripe/ | Stripe-specific helpers |
| lib/auth/ | authentication helpers |
| lib/account/ | user account |
| lib/admin/ | admin functions |
| lib/db/ | DB helpers |
| lib/browser/ | browser helpers |
| lib/products/ | product catalog |
| lib/compliance/ | compliance/legal |
| lib/printful/ | Printful fulfilment |
| lib/square/ | Square POS |
| lib/runtime/ | runtime contract enforcement |
| lib/build/ | build helpers |
| lib/worldclass/ | "world-class" assertions |
| lib/web3/ | Web3 helpers |
| lib/wallet/ | wallet connect |
| lib/ui/ | UI primitives |
| lib/api/ | API helpers |
| lib/hooks/ | React hooks |
| lib/server/ | server-side route helpers |
| lib/jobs/ | background jobs |
| lib/launch/ | launch helpers |
| lib/importers/ | data importers |
| lib/observability/ | logging/metrics |
| lib/orders/ | order management |
| lib/privacy/ | privacy / consent |
| lib/product/ | product detail |
| lib/reporting/ | reporting / PDF |
| lib/search/ | search |
| lib/seo/ | SEO metadata |
| lib/audio/ | audio (uncommon) |
| lib/motion/ | framer-motion wrappers |
| lib/navigation/ | navigation |
| lib/verify/ | verification helpers |
| lib/legal/ | legal texts |

## Application routes (sample, not exhaustive)

Routes under `/[locale]/`:

- `/` — landing
- `/security/audits` — Audit intake
- `/security/audits/pricing` — tier pricing
- `/security/audits/registry` — public registry
- `/security/audits/sample` — sample audit
- `/security/audits/benchmark` — benchmark page
- `/security/audits/customer-report/[id]` — customer report
- `/security/audits/delivery-receipt/[receiptId]` — receipt
- `/security/audits/export/[id]` — export
- `/security/audits/support-handoff/[receiptId]` — support
- `/shield` — Shield Basic
- `/shield-pro` — Shield Pro
- `/shield-map` — Shield Map
- `/real-markets` — Real Markets
- `/market-integrity` — Market Integrity landing
- `/market-integrity/shield-map` — alternate route
- `/market-integrity/cross-asset` — cross-asset
- `/market-integrity/about` — about
- `/browser` — Browser
- `/intelligence` — Angel / Risk Indicator
- `/risk-methodology` — methodology
- `/checkout` — checkout
- `/cart` — cart
- `/account` — account
- `/admin/security` — admin
- `/admin/orders` — orders
- `/admin/import-products` — import
- `/admin/security/audit-inbox` — audit inbox
- `/login` — login
- `/vlm-token` — VLM token
- `/vlm-token/faq` — VLM token FAQ
- `/trust-center` — trust
- `/runtime-proof` — runtime proof
- `/token-agreement` — token agreement
- `/terms` — terms
- `/privacy` — privacy
- `/impressum` — impressum
- `/contact` — contact
- `/faq` — FAQ
- `/community` — community
- `/research-lab` — research lab
- `/motion-lab` — motion lab
- `/atelier` — atelier
- `/lookbook` — lookbook
- `/shop`, `/shop/[id]` — shop
- `/archive` — archive
- `/returns`, `/shipping` — logistics
- `/checkout/success`, `/checkout/cancel` — checkout completion
- `/verify` — verify
- `/[...missing]` — 404

API directory exists at `app/api/` but was not enumerated in Pas 1.

## Application structure pattern

- App Router pages in `app/[locale]/.../page.tsx`
- i18n via `next-intl`
- Customer reports parameterized via `[id]`
- Admin under `/admin/`
- Receipt/delivery routes return parameterized content
- Tailwind for styling, framer-motion for animation, three for 3D (where used)

## API architecture

NOT_INVESTIGATED in Pas 1. Route count and pattern unknown.
Will be enumerated in Pas 3 (Security) or Pas 4 (Payments).

## Service architecture

NOT_INVESTIGATED in Pas 1. lib/ contains 1640 files; service-level
boundaries are not yet mapped.

## Database architecture

| Field | Value | Source |
|---|---|---|
| DB engine (prod) | Supabase (Postgres) | package.json + .env.local |
| DB engine (dev/test) | @electric-sql/pglite 0.5.4 | package.json devDeps |
| Migrations directory | supabase/migrations/ | 135 SQL files |
| RLS | present in config but not yet inspected | UNKNOWN per Pas 1 |
| Functions | supabase/functions/ | directory exists, not enumerated |
| Local DB proof | exists as fixture | per master mission §11 (NOT VALIDATED as production) |

## Auth architecture

- Supabase auth (per .env.local keys)
- Google OAuth: NOT configured in .env.local — EXTERNAL_BLOCKER
- Session handling: signedSessionConfigured=true per Pas 0 review
- Multi-tenant: claimed in master mission §33, NOT verified in Pas 1

## Tenant boundaries

- Schema/table-level tenancy
- NOT yet verified which columns are tenant ids (account_id, tenant_id)
- NOT_INVESTIGATED in Pas 1

## Storage

- Supabase Storage (assumed, not verified)
- Signed URLs referenced in master mission §34
- Path traversal resistance: NOT verified

## Artifact pipeline

- PDF generation: lib/reporting/ (inferred)
- 9 PDFs (3 tiers × 3 locales) — historical claim from Pas 0 review
- PDF signing / auth: master mission §34 — NOT verified

## AI architecture

- Model: Gemini (gemini-3.7-flash mentioned in master mission; needs
  runtime verification)
- Provider abstraction: lib/market-integrity/angel-provider-gateway.ts
- Orchestration: lib/market-integrity/ai-orchestrator.ts
- Risk: lib/market-integrity/ai-risk-bot.ts
- Grounding: enforced via policy (per Pas 0 review)
- Server-side only — no NEXT_PUBLIC_ keys leak AI secrets

## Provider abstraction

- Adapters in lib/market-integrity/ (coingecko, pyth, alpha-vantage,
  binance × 3, defillama × 2)
- Provider-rights registry: config/pass21/provider-commercial-rights-registry.json
  (Pyth was added recently with rightsState:UNVERIFIED)
- Brokered egress: lib/network/brokered-egress.ts
- API guardrails: lib/market-integrity/api-guardrails.ts

## Market-data architecture

- 585 instruments in catalog (per Pas 0 review — UNVERIFIED locally)
- Multi-provider strategy per master mission §2–15
- Reference vs live mode distinction: master mission §17
- CoinGecko/Pyth/Binance fallback chain (partially implemented per adapter list)

## Entitlement architecture

- Server-side: lib/security/api-guard.ts, lib/security/api-edge-boundary.ts
- UI tier indicators exist
- Stop-sell: declared for Pro/Advanced
- Direct API bypass: NOT verified

## Payment architecture

- Stripe integration in lib/payments/, lib/checkout/, lib/stripe/
- Square (POS) in lib/square/
- Printful (fulfilment) in lib/printful/
- Stripe keys: MISSING from .env.local → EXTERNAL_BLOCKER
- Webhook handling: claimed, NOT verified

## PDF architecture

- Generation engine: NOT_INVESTIGATED in Pas 1
- Visual inspection: historical 9-PDF claim (Pas 0)
- Localization: 3 locales supported
- Authorization: NOT verified

## Testing architecture

- Playwright 1.60.0 E2E
- Deep-customers with 100 personas (recent commits reference this)
- scripts/pass* verification chains (hundreds of npm scripts)
- scripts/a* acceptance scripts
- Vitest NOT present
- Jest NOT present
- Master mission §87–89 warns about hardcoded scores / placeholder tests
  — audit of test quality is Pas 7

## CI/CD

- .github/workflows exist (NOT inspected in Pas 1)
- Build: npm run build (calls build:turbopack)
- Smoke: smoke:production:turbopack, smoke:production:webpack
- Master mission §55: GitHub workflows must be inspected before claiming CI proof

## Environment / configuration architecture

- .env.local: 8 keys (Supabase×6, Gemini×1, JWKS×1)
- 7 keys MISSING: CoinGecko, Pyth, Stripe×2, DeFiLlama, TwelveData, admin×2
- velmere-runtime-contract.mjs: enforces runtime + critical-file sha256
- Runtime contract verifier: scripts/verify-runtime-contract.mjs
- Build preflight: scripts/deployment/preflight.mjs

## A42 runtime contract (Pas 1 critical finding)

- Critical files have expected sha256 hashes
- Drift between expected and actual = "mixed or outdated project tree"
- Currently 5/114 checks fail; ACTIVE_PASS = ACTION_REQUIRED
- This means: dev server blocks until either (a) files are restored to last
  PASS state, or (b) a new PASS is run that re-binds the contract
- IMPACT: Pas 1 cannot start the dev server until this is resolved
- DECISION NEEDED: B-005

## What is NOT covered in this file

The following are intentionally NOT enumerated here:

- Every route handler (see `app/` for full enumeration)
- Every API endpoint (see `app/api/`)
- Every component (172 files)
- Every script (79 subdirs)
- Every receipt / artifact
- Every migration (135 SQL files)

These are summarized at subsystem level only. Deeper inspection is the
work of the relevant pas (Pas 2 for products, Pas 3 for security, etc.).