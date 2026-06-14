# VELMERE PASS 106 — Advanced 3D Tile Brain / Searchable Investigator Cockpit

## Base
Built on PASS 105 `velmere_pass105_vlm_neural_tile_ux_fix`.

## Main goal
Move the Advanced VLM readout away from a flat radial chart into a more useful 3D tile-brain cockpit.

## Implemented

### 1. Advanced-only tile interaction
Advanced mode now has:
- searchable tile input,
- category filters,
- clickable investigator tiles,
- detail panel.

Basic mode stays simple:
- top 10 public readout,
- no deep tile interaction.

### 2. Search and filters
Added Advanced cockpit controls:
- Search tile
- All
- Risk
- Liquidity
- Holders
- Signals
- Sources
- Access

Labels are locale-aware:
- Polish
- German
- English

### 3. Better tile content
Tiles are now investigative, not price spam:
- supply / float
- unlocks
- liquidity exits
- holder graph
- KOL/social
- contract owner
- missing data
- evidence chain
- loss prevention
- verdict

### 4. Performance improvements
Reduced canvas load:
- lower DPR cap,
- fewer 3D brain nodes,
- fewer data packets,
- no SVG radial spaghetti in Advanced mode.

Advanced now relies more on 3D tiles and less on a heavy line network.

### 5. UX fixes retained
- Back button remains no-drag and click-safe.
- Cards are no-drag.
- Detail close is no-drag.
- Old debug controls stay removed.
- Vercel `motionQuality !== "low"` issue remains removed.

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
- old hardcoded `back to chart`: 0
- old `motionQuality !== "low"` comparison: 0

## Remaining
This is still not final. Next pass should:
- make the tile brain rotate as a real 3D carousel/ring around the core,
- add mobile simplified advanced mode,
- persist selected tile state,
- connect tiles to source ledger/evidence report sections,
- move inline locale UI strings into message JSON.
