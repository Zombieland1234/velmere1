# VELMERE PASS 106.1 — Terminal Runtime Hotfix + Autosuggest + Translation Sweep

## Base
Built on PASS 106 workstream.

## Critical runtime fix
Fixed:
- `components/market-integrity/TokenRiskModal.tsx`

Runtime error:
`ReferenceError: index is not defined`

Cause:
3D card transform used `index`, but one `.map()` branch did not pass `index`.

Fix:
- deck map now uses `(node, index)`
- added `safeTileIndex`
- replaced direct transform index usage with `safeTileIndex`
- verified old raw `((index % 5)` and `(index % 4)` patterns are gone

## Removed duplicate text under VLM orb
Removed the duplicated center label:
- `odczyt ryzyka`
- `risk extraction`
- `RISK {riskScore}%`

Reason:
Risk is already represented in tiles. The extra label was overlapping the orb and making the UI look messy.

## Autosuggest for investigator search
Updated:
- `components/market-integrity/ShieldMapClient.tsx`

Added:
- token suggestions when typing one or more letters
- suggestions from live inbox, rule hits, watchlist and common tokens
- click suggestion to fill the input
- no direct API spam required
- suggestion panel styling

## Translation sweep
Added locale-aware labels for key Shield Map sections:
- Polish
- German
- English

Localized:
- live investigator console heading/body
- scan button
- placeholder
- operator rule
- investor protection section
- trust psychology section
- core guardrails/principles in visible arrays

This does not translate the entire historical PASS archive yet, but fixes the most visible current product sections and creates the pattern for the next sweep.

## Performance / visual cleanup
- Advanced SVG line network remains disabled.
- Animation node/packet count remains reduced.
- Advanced should read more like a tile-brain cockpit, not a spaghetti graph.

## Validation
Passed:
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- likely unescaped JSX apostrophes: 0
- duplicated orb risk label: 0
- raw transform index modulo patterns: 0

## Remaining
Next pass should:
- move inline locale strings into locale JSON files
- translate old PASS archive sections fully
- add autosuggest to the main market terminal search too
- replace the tile deck with a real 3D carousel/ring
- keep testing Vercel runtime after every pass
