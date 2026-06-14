# VELMERE PASS 105 — VLM Neural Tile UX Fix / Vercel MotionQuality Fix

## Base
Built on PASS 104 `velmere_pass104_data_backbone_zod_vercel_context_fix`.

## Critical Vercel fix
Fixed:
- `components/market-integrity/TokenRiskModal.tsx`

Vercel error:
`This comparison appears to be unintentional because the types '"medium" | "high"' and '"low"' have no overlap.`

Cause:
The JSX condition used:
`!isAdvanced && motionQuality !== "low"`

TypeScript narrowed the branch and treated the comparison as impossible.

Fix:
Removed the unnecessary `motionQuality !== "low"` flow path entirely and removed the extra animated SVG flow path for performance.

## UX fixes from screenshot/user feedback

### 1. Back to chart not working
Fixed:
- overlay drag handler now ignores elements marked `data-vlm-no-drag="true"`
- topbar/back button uses no-drag marker
- back button stops pointer/click propagation before calling `onClose()`

### 2. Cards not clickable
Fixed:
- readout cards now stop pointer drag capture
- advanced cards can open the detail panel
- basic mode stays simple and does not open detail interactions

### 3. Removed useless controls
Removed top controls:
- auto on/off
- reset
- minus
- plus

They were confusing and looked like dev controls.

### 4. Neural readout content changed
The neural readout no longer wastes tiles on live price. It now shows investigation/risk tiles:

Basic top 10:
- risk core
- supply float
- unlock map
- exit liquidity
- holder layer
- KOL/social
- contract risk
- volatility
- evidence
- verdict

Advanced top 20:
- risk core
- float transparency
- unlock pressure
- liquidity exit
- holder graph
- missing data
- source quality
- KOL disclosure
- contract owner
- volume quality
- flow ratio
- orderbook
- anomaly count
- top signal
- drawdown
- volatility
- evidence chain
- loss prevention
- VLM access
- verdict

### 5. More organic tile layout
Advanced cards are no longer perfectly symmetrical rows.
They are placed in controlled irregular positions to feel less artificial while avoiding overlap.

### 6. 3D tile feel
Added:
- `.shield-vlm-tile-deck`
- 3D perspective
- per-card rotateX/rotateY/translateZ
- hover lift
- reduced-motion fallback
- mobile simplified behavior

### 7. Translations
Improved overlay labels for:
- Polish
- German
- English

Topbar/back/phase/point labels are now locale-aware.

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
- old `motionQuality !== "low"` comparison: 0
- raw hardcoded `back to chart`: 0

## Remaining
This is still not a final professional brain. Next pass should:
- reduce canvas node count further on medium PCs,
- turn advanced into a real searchable tile carousel/ring,
- add filter/search for tile categories,
- add mobile-only compact advanced mode,
- add proper translation keys into message JSON instead of inline object.
