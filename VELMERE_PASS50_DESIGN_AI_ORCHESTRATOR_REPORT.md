# Velmère Shield — Pass 50

## Direction correction
The pass treats Shield as an AI risk bot / SOC-style terminal, not a normal dashboard. The goal is to keep the front page clean while moving intelligence, explanations and evidence into interactive layers and the token terminal.

## Core additions
- Added AI Orchestrator engine: `lib/market-integrity/ai-orchestrator.ts`
- Added API endpoint: `/api/market-integrity/orchestrator?query=BTC`
- Evidence report now includes `aiOrchestrator`
- Modal now has an AI Orchestrator panel that ranks next actions and shows confidence gates
- Main shield brain panel now links to AI bot JSON and Orchestrator JSON

## Design and typography hardening
Added global Shield design classes in `app/globals.css`:
- `shield-typography-root`
- `shield-terminal-font`
- `shield-serif-display`
- `shield-safe-card`
- `shield-table-shell`
- `shield-table-cell`
- `shield-no-overlap`
- `shield-mobile-chart-height`
- `shield-copy-safe`

These are used to reduce layout collisions, preserve font consistency, keep long names from overlapping controls, and make mobile charts less destructive.

## Table / logo / overlap fixes
- Table is now safer with `table-fixed` and fixed key widths
- Coin names are truncated safely instead of colliding
- Symbols stay visible under names
- Avatars/logos stay in the first visual group
- Horizontal overflow is contained in a safe scroll shell
- Table container uses `shield-table-shell`

## Modal fixes
- Modal root now uses Shield typography and no-overlap safety classes
- Header switches from one rigid row to mobile-safe column/flex-wrap
- Asset symbol uses safe display typography and truncation
- Asset name truncates before it can collide with buttons
- Top controls wrap instead of pushing into the title
- Chart height is responsive through `shield-mobile-chart-height`
- Chart source row becomes stacked on small screens
- Sidebar and modal grids use `minmax(0,...)` to avoid content blowouts

## New verification
Added design safety script:
- `scripts/verify-shield-design-safety.mjs`

New package scripts:
- `npm run verify:shield-design`
- `npm run verify:shield-all`

The design script checks that Shield typography/overlap classes exist and that risky modal/table patterns are not reintroduced.

## Files changed
- `app/globals.css`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `lib/market-integrity/ai-orchestrator.ts`
- `app/api/market-integrity/orchestrator/route.ts`
- `app/api/market-integrity/report/route.ts`
- `scripts/verify-market-integrity-no-truncation.mjs`
- `scripts/verify-shield-design-safety.mjs`
- `package.json`

## Checks run
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `npm run verify:shield`
- `npm run verify:shield-design`
- TS/TSX transpile smoke for changed files
