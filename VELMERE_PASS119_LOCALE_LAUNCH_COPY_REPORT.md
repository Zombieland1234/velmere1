# VELMERE PASS 119 — Locale Surface + Launch Copy Cleanup

## Base
Built on PASS 118.

## Main purpose
The previous pass was too narrow. This pass takes a wider product-surface scope: homepage, footer, Shield Map visible copy, PL/DE/EN message keys and regression guards.

## Implemented

### 1. Homepage localization
Updated:
- `components/home/HomePageClient.tsx`

Added:
- `homeCopy(locale)`

The homepage now has PL/DE/EN copy for:
- hero
- clothing-first section
- launch reality ledger
- Shield / Investigator block
- drop architecture
- pillars
- flow
- clothing atelier
- Shield rails

### 2. Footer localization
Updated:
- `components/Footer.tsx`

Added:
- `footerCopy(locale)`

Footer now localizes:
- tagline
- microcopy
- explore links
- legal links
- trust notes
- copyright / launch-control note

### 3. Message key cleanup
Updated:
- `messages/pl.json`
- `messages/de.json`
- `messages/en.json`

Fixed high-impact:
- Common
- Nav
- Footer

PL no longer shows basic values like `Close`, `Open`, `Loading`, `Shop menu`, `Connect wallet`, etc.
DE no longer shows basic English in those same high-impact keys.

### 4. Shield Map locale cleanup
Updated:
- `components/market-integrity/ShieldMapClient.tsx`

Localized high-impact Shield Map blocks:
- `pageCopy`
- `atlasNodes`
- `sourceRails`
- `investigatorProtocol`
- `commandRoomCards`
- `launchBridgeContracts`

This does not finish every legacy panel, but it removes a lot of the worst visible mixed-language surface.

### 5. Locale guard
Added:
- `scripts/verify-locale-surface.mjs`

Updated:
- `package.json`
- `scripts/vercel-preflight.mjs`

New command:
- `npm run verify:locale-surface`

`verify:shield-all` now includes locale-surface verification.

## Validation
Passed:
- `node scripts/check-i18n.mjs` → exit 0
- `node scripts/vercel-preflight.mjs` → exit 0
- `node scripts/verify-market-integrity-no-truncation.mjs` → exit 0
- `node scripts/verify-shield-design-safety.mjs` → exit 0
- `node scripts/verify-risk-engine-safety.mjs` → exit 0
- `node scripts/verify-vlm-brain-performance.mjs` → exit 0
- `node scripts/verify-locale-surface.mjs` → exit 0

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX TS/JS artifacts: 0
- old TokenRisk/risk-engine/VLM/PageCopy bad terms: 0

## Progress note

| Area | Previous | After PASS 119 | Change |
|---|---:|---:|---:|
| UI shell / layout | 49–50% | 50–51% | +1% |
| Shield terminal | 44–46% | 45–47% | +1% |
| VLM AI risk brain | 31–35% | 31–35% | 0% |
| VLM visual brain / motion | 38–42% | 38–42% | 0% |
| Data / API spine | 32–33% | 32–33% | 0% |
| Legal / launch safety | 50–52% | 52–54% | +2% |
| Mobile polish | 31–33% | 31–33% | 0% |
| Full translations | 35–36% | 42–45% | +7–9% |
| Clothing commerce readiness | 47–50% | 49–51% | +2% |
| Whole brand/site launch readiness | 46–48% | 48–50% | +2% |

## Remaining blockers
- Deep Shield Map still contains many operator/technical English terms intentionally or as legacy copy; later pass should continue section-by-section.
- Full Vercel/Next build must still be confirmed.
- AI brain data feeds and product fulfilment QA remain incomplete.
