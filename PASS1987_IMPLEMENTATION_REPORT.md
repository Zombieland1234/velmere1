# PASS1987 — list continuation: gesture blockers, five-piece modal stability, Square scroll polish

## Scope
Continues the user's UI/runtime checklist after PASS1986:
- Keep Shield and Real Markets asset popups moving toward the same five-piece layout.
- Keep Basic / Pro / Advanced analysis inside the popup instead of full-screen takeover.
- Reduce scroll/gesture bugs caused by old wheel/touch/pointer blockers.
- Clean obvious duplicate/pointless lines in critical UI code.
- Keep Square post modal centered and scroll-owned.

## Main changes
1. Unified asset modal shell now has a PASS1987 marker:
   - `data-pass1987-five-piece-polish="single-grid-chart-rail-scroll-safe"`
   - CSS final override keeps the modal width, max-height, body scroll owner and chart/depth grid stable.

2. Chart gesture hygiene:
   - removed chart-panel `onTouchMove` and `onPointerMove` stopPropagation blockers.
   - wheel stays contained, modifier-wheel can still prevent default for zoom-like intent.
   - CSS sets `touch-action: pan-y pinch-zoom` for the chart panel instead of old `touch-action:none` fights.

3. VLM Brain contained cleanup:
   - added `data-pass1987-contained-vlm="modal-bounded-no-duplicate-overscroll"`.
   - removed duplicate `overscrollBehavior` style line.
   - contained VLM uses explicit `pan-y` so it scrolls inside the modal instead of fighting the page.

4. Basic / Pro / Advanced rail:
   - added `data-pass1987-depth-dock="three-stable-actions-no-legacy-bubbles"`.
   - final CSS gives three stable cards with a small delayed arrival animation, not old bubble/orbit behavior.

5. Square post modal:
   - added `pass1987-square-modal=centered-owned-scroll` marker.
   - final CSS keeps the post modal centered, contained, and internally scroll-owned.

6. Command page polish:
   - Lens/Browser and Shield Map quick pills are capped to three visible actions.
   - command headline uses balanced wrapping.

## Verification
- `node scripts/verify-pass1987-list-continuation-audit.mjs` — OK, 13/13
- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK
- alias import scan — OK
- changed-file tsc parse attempt only shows expected missing dependency/type errors without `node_modules`.

## Remaining QA
Needs browser testing on the user's machine:
- exact animation feel of menu/cart/wallet.
- exact modal proportions after clicking real Shield and Real Markets rows.
- Square close/scroll restore after repeated open/close cycles.
