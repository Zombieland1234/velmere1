# Velmère PASS412 — Terminal Bugfix Runtime

Focus: hotfix-only pass for the exact bugs reported from localhost screenshots/logs.

## Fixed

1. Shield search dropdown
- Max 3 suggestions.
- Local-first only while typing to reduce lag.
- Panel height capped and frame reduced.
- Router max reduced to 3.

2. Velmère Browser search dropdown
- Max 3 Lens suggestions.
- New `searchAnchorRef` anchors the portal to the actual input row, not the full hero/form surface.
- Panel width/height capped so it appears directly under the search bar instead of floating at a random top position.

3. Real Markets / Real Stocks React object crash
- Added `PseudoMarketPatchValue` sanitization.
- Object-shaped pseudo patches like `{ price, change }` are converted into strings before JSX render.
- `formatPseudoPrice` reads `patch.price`; `formatPseudoChange` reads `patch.change`.
- This targets the runtime error: `Objects are not valid as a React child (found: object with keys {price, change})`.

4. Real Markets Orbit 360 paused
- Removed the heavy `MarketBrainAudit` render from the Real Markets modal for now.
- Basic / Pro / Advanced buttons only change mode state; they do not spawn the neural/orbit brain layer.
- Added a small safe status strip: `Orbit 360 paused`.

5. Chart drag first-frame jump
- Added `event.preventDefault()` on chart pointer down.
- Added an 18px dead-zone before changing bars.
- Kept direct-drag direction, but stopped the first tiny pointer movement from snapping the chart.

6. Research Lab kernel imports
- Added missing PASS390/PASS391 research imports used by the rendered page.
- Research Lab remains in audit / replication / falsification language.

## Validation

- `npm run verify:pass412-terminal-bugfix-runtime` ✅
- `npm run verify:pass411-terminal-source-equalizer-orbit` ✅
- `npm run check:i18n` ✅
- `npm run vercel:preflight` ✅
- `npm run typecheck` ❌ not conclusive in this export because dependencies/types are not installed in the package (`next`, `react`, `lucide-react`, `next-intl`, `@types/node`, etc.).

## Main touched files

- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `app/[locale]/research-lab/page.tsx`
- `lib/market-integrity/pass412-terminal-bugfix-runtime.ts`
- `scripts/verify-pass412-terminal-bugfix-runtime.mjs`
- `package.json`
