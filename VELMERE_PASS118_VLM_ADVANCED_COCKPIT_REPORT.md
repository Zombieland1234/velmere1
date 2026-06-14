# VELMERE PASS 118 — Advanced VLM 3D Cockpit Readability

## Base
Built on PASS 117.

## Main purpose
After performance hardening, the next issue was that Advanced VLM cards still felt too random/flat and could visually collide. This pass makes Advanced mode more like a controlled cockpit.

## Implemented

### 1. Typed Advanced tile placement helper
Updated:
- `components/market-integrity/TokenRiskModal.tsx`

Added:
- `advancedTileStyle(node, index): CSSProperties`

Changed:
- removed old ad-hoc index transform logic
- no `safeTileIndex`
- controlled left/right cockpit rails
- row-based vertical spacing
- calmer `rotateX/rotateY/translateZ`
- cards remain clickable
- Basic layout remains unchanged

### 2. Advanced VLM 3D cockpit CSS
Updated:
- `app/globals.css`

Added PASS118 overrides:
- `shield-vlm-tile-anchor`
- stronger readable 3D card styling
- hover/active depth
- fixed mobile fallback
- reduced-motion transform disable
- detail panel z-index safety

### 3. Guard updated
Updated:
- `scripts/verify-vlm-brain-performance.mjs`
- `scripts/vercel-preflight.mjs`

Now guards:
- no `safeTileIndex`
- `advancedTileStyle` must exist
- `shield-vlm-tile-anchor` must exist
- old VLM risk/Math.random/index bugs remain blocked

## Validation
Passed:
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`
- `node scripts/verify-risk-engine-safety.mjs`
- `node scripts/verify-vlm-brain-performance.mjs`

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX TS/JS artifacts: 0
- old TokenRisk/risk-engine/VLM bad terms: 0
- `Math.random` in TokenRiskModal: 0
- `advancedTileStyle` occurrences: 2
- PASS118 CSS block: 1

## Progress note

| Area | Previous | After PASS 118 | Change |
|---|---:|---:|---:|
| UI shell / layout | 48–49% | 49–50% | +1% |
| Shield terminal | 42–44% | 44–46% | +2% |
| VLM AI risk brain | 31–35% | 31–35% | 0% |
| VLM visual brain / motion | 32–36% | 38–42% | +6% |
| Data / API spine | 32–33% | 32–33% | 0% |
| Legal / launch safety | 50–52% | 50–52% | 0% |
| Mobile polish | 29–31% | 31–33% | +2% |
| Full translations | 35–36% | 35–36% | 0% |
| Clothing commerce readiness | 47–50% | 47–50% | 0% |
| Whole brand/site launch readiness | 44–46% | 46–48% | +2% |

## Remaining blockers
- Still not a full draggable 3D card carousel/orbit; this is cockpit readability and placement stabilization.
- Full Vercel/Next build must be confirmed.
- Live source feeds and product fulfilment QA remain incomplete.
