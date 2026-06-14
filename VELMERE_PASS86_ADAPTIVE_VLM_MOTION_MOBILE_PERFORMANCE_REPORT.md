# Velmere PASS 86 - Adaptive VLM Motion and Mobile Performance

## Goal
PASS 86 turns the PASS 85 neural readout into an adaptive animation system. The visual direction stays cinematic, but the runtime now scales its cost to the device and viewport instead of applying desktop effects everywhere.

## Main implementation
- Added `high`, `medium`, and `low` VLM motion profiles.
- Profiles consider viewport width, `prefers-reduced-motion`, `devicePixelRatio`, and `navigator.hardwareConcurrency`.
- Mobile and low-power profiles reduce graph nodes, canvas particles, glow blur, DPR, CSS background animation, and SVG transmitters.
- The neural canvas caches its grid on resize instead of rebuilding it every frame.
- Removed per-frame random particle radius generation and per-line gradient creation.
- Added a curved orb entry path, subtle trail, landing overshoot, and arrival shockwave.
- Throttled the completed idle state to lower CPU usage.
- Paused animation work when the document is hidden.
- Added cleanup for requestAnimationFrame, visibility listeners, ResizeObserver, timers, particles, nodes, and trails.

## Mobile layout
- Idle popup keeps vertical scroll and avoids horizontal overflow.
- Mobile readout keeps the VLM core visible and moves metric cards into a horizontal touch rail.
- Basic keeps 10 metric cards.
- Advanced keeps 20 metric cards without surrounding-orb overlap on narrow screens.
- Back to chart stays visible at the top edge.
- Mobile token ticker no longer truncates unnecessarily in the compact header.

## Runtime and build repairs
- Fixed Windows path handling in `scripts/vercel-preflight.mjs`.
- Added a modern TypeScript target for iterator-safe compilation.
- Repaired stale Market Integrity metric and score field names.
- Tightened optional-value handling in replay and SOC helpers.
- Fixed the Shield Map JSX apostrophe lint failure.

## Validation
Passed:
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run check:i18n`
- `npm.cmd run vercel:preflight`
- `npm.cmd run verify:shield-all`
- `git diff --check`

## Browser QA
Desktop:
- Basic: 10 cards, 1 canvas, `high` quality, no horizontal overflow.
- Advanced: 20 cards, 1 canvas, `high` quality, no horizontal overflow.
- Back to chart removes the overlay and canvas.
- Replay creates one fresh overlay and one fresh canvas.
- Escape returns from readout to chart without closing the token modal.

Mobile viewport (`390x844`):
- Idle popup fits the width and keeps vertical scrolling.
- Global horizontal overflow stays at `0`.
- Basic: 10 cards, 1 canvas, `low` quality, touch-scroll rail.
- Advanced: 20 cards, 1 canvas, `low` quality, touch-scroll rail.
- Closing the modal leaves `0` overlays, `0` canvases, and `0` token modals.

## Known local source behavior
The local USDT run observed a CoinGecko `401` fallback path. The modal stayed stable and rendered fallback chart data as intended.
