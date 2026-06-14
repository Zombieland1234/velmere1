# Velmère PASS 124 — VLM Visual Brain Motion Protocol

## Purpose
The VLM sequence must feel like a professional 360-degree risk brain, not a fast decorative burst.

## What changed
- Advanced mode now uses deterministic organic tile slots instead of symmetric rows.
- Tiles are still non-overlapping, but they look less machine-even.
- Signal packets move slower.
- The orb/brain/readout phases are paced more slowly.
- Drag rotation is smoother and less twitchy.
- Advanced active tile gets stronger depth/z-index.
- Mobile falls back to flat safe cards to avoid lag and overlap.
- CSS guards preserve reduced-motion and mobile-safe behaviour.

## UX rule
Advanced can look cinematic, but it cannot hurt usability. On small screens and low-motion devices, readable cards beat fake 3D.

## Regression risks blocked
- old `index` transform bug,
- duplicate risk text under orb,
- canvas risk text,
- `Math.random()` in VLM brain,
- old `safeTileIndex` workaround,
- missing PASS124 organic motion markers.
