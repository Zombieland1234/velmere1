# VELMERE PASS 117 — VLM Visual Brain Performance + Mobile Stability

## Base
Built on PASS 116.

## Main purpose
Improve the VLM visual brain because the user reported lag, especially on desktop and concern about mobile performance.

## Implemented

### 1. Deterministic VLM brain graph
Updated:
- `components/market-integrity/TokenRiskModal.tsx`

Changed:
- removed `Math.random()` from the VLM brain canvas path
- added deterministic seeded graph generation based on symbol/mode/risk/readout count
- graph layout is now more stable and less jittery between renders/resizes

### 2. Removed duplicated risk text under the orb
The canvas no longer renders:

- `RISK ${riskScore}%`

under the VLM orb. The risk score already exists in the terminal/readout UI, so the orb stays cleaner.

### 3. Lower lag / mobile budget
Changed:
- Advanced node budget capped lower
- Advanced transmitter/packet budget capped lower
- packet speeds calmed down
- frame budget relaxed
- canvas slows down after readout completion
- canvas stops after a hard maximum lifetime

This should reduce CPU/GPU burn, especially on phones and lower-end laptops.

### 4. Better animation lifecycle
Changed:
- background tab visibility now cancels requestAnimationFrame
- returning to tab restarts cleanly
- low-power / reduced-motion path still stops early
- canvas is `aria-hidden`

### 5. New VLM performance guard
Added:
- `scripts/verify-vlm-brain-performance.mjs`

Updated:
- `package.json`
- `scripts/vercel-preflight.mjs`

New command:
- `npm run verify:vlm-brain`

`verify:shield-all` now also runs the VLM brain performance guard.

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

## Progress note

| Area | Previous | After PASS 117 | Change |
|---|---:|---:|---:|
| UI shell / layout | 47–48% | 48–49% | +1% |
| Shield terminal | 40–41% | 42–44% | +2–3% |
| VLM AI risk brain | 31–35% | 31–35% | 0% |
| VLM visual brain / motion | 24–28% | 32–36% | +8% |
| Data / API spine | 32–33% | 32–33% | 0% |
| Legal / launch safety | 49–51% | 50–52% | +1% |
| Mobile polish | 25–26% | 29–31% | +4–5% |
| Full translations | 35–36% | 35–36% | 0% |
| Clothing commerce readiness | 47–50% | 47–50% | 0% |
| Whole brand/site launch readiness | 42–44% | 44–46% | +2% |

## Remaining blockers
- Visual brain still needs a later true 3D/clickable-card redesign, not only performance hardening.
- Full Vercel/Next build still needs deployment confirmation.
- AI risk brain still needs real live feeds.
- Product catalog and fulfilment data remain incomplete.
