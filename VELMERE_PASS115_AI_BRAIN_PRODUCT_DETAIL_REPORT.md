# VELMERE PASS 115 — AI Risk Brain Integration + Product Detail Launch Controls

## Base
Built on PASS 114.

## Main purpose
The user provided the current Codex AI brain file. This pass integrates it into the real project while continuing clothing-commerce launch readiness.

## Implemented

### 1. Codex AI risk brain integrated
Updated:
- `lib/market-integrity/risk-engine.ts`

Integrated the uploaded Codex file as the production risk engine.

New risk brain features now present:
- asset profile detection: standard / stablecoin / RWA
- confidence model
- data consistency review
- missing-data limitations
- velocity / liquidity / microstructure / holder / contract / data agents
- stablecoin/RWA special handling
- meta-model summary with limitations and escalation
- deterministic multi-agent fusion scoring

### 2. Product detail pre-purchase controls
Updated:
- `components/shop/ProductDetailClient.tsx`

Added localized controls:
- size explanation
- material/care clarity
- delivery/fulfilment clarity
- VLM separation from checkout
- consumer-rights-safe pre-payment copy

### 3. Product detail translations fixed
Updated:
- `messages/en.json`
- `messages/pl.json`
- `messages/de.json`

Polish and German product detail pages no longer show the old English placeholder checkout text.

### 4. Progress ledger updated
Updated:
- `docs/progress/PROJECT_PROGRESS_LEDGER.md`

## Validation
- `node scripts/check-i18n.mjs` → exit 0
- `node scripts/vercel-preflight.mjs` → exit 0
- `node scripts/verify-market-integrity-no-truncation.mjs` → exit 0
- `node scripts/verify-shield-design-safety.mjs` → exit 0

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX TS/JS artifacts: 0
- old TokenRisk/risk-engine bad terms: 0

## Progress note

| Area | Previous | After PASS 115 | Change |
|---|---:|---:|---:|
| UI shell / layout | 46–47% | 47–48% | +1% |
| Shield terminal | 38–40% | 39–41% | +1% |
| VLM AI risk brain | 18–25% | 30–34% | +9–12% |
| Data / API spine | 30–31% | 31–32% | +1% |
| Legal / launch safety | 45–46% | 47–49% | +2–3% |
| Mobile polish | 24–25% | 25–26% | +1% |
| Full translations | 32–33% | 35–36% | +3% |
| Clothing commerce readiness | 41–43% | 47–50% | +6–7% |
| Whole brand/site launch readiness | 37–39% | 41–43% | +4% |

## Remaining blockers
- Full Vercel/Next build still needs deployment confirmation.
- AI brain is stronger but still needs real holder/orderbook/contract/OSINT feeds.
- Product catalog still needs final real products, images, variants, tax/shipping and provider QA.
- Evidence export, audit storage and production rate limits remain blocked.
- Visual VLM brain still needs a separate performance/3D pass.
