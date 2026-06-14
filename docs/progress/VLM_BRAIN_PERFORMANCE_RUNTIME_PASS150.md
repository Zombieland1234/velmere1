# Velmère PASS 150 — VLM Brain Performance Runtime

## Purpose
PASS150 continues PASS149 and focuses on the Advanced VLM brain runtime.

The goal is not to pretend that React/CSS DOM cards can become true native 144 fps.
The goal is to reduce re-render pressure, add a runtime governor and keep the path open for a future WebGL/Three.js brain if the real browser still stutters.

## Main changes
- Added `BrainRuntimeMode = "performance" | "cinematic"`.
- Advanced Orbit 360 now has a Performance/Cinematic runtime governor.
- Performance is the default runtime.
- Cinematic can auto-downgrade to Performance after repeated slow frames.
- React orbit ticks are now sparse and compositor-friendly.
- Orbit card movement uses longer CSS transition interpolation instead of high-frequency React updates.
- Heavy canvas is only allowed in Advanced + high quality + Cinematic.
- Basic and Pro remain static and lightweight.
- `advancedOrbitalSlots` is memoized instead of rebuilt per card render.
- Added PASS150 CSS for runtime governor and performance orbit mode.
- Added `scripts/verify-vlm-brain-performance-runtime-safety.mjs`.
- Wired PASS150 runtime checks into Vercel preflight and package scripts.

## Runtime behavior
- Basic Analysis: static cards, no heavy 3D.
- Pro Review: static source/evidence cards.
- Advanced Analysis:
  - `Performance`: default, fewer React orbit updates, smoother compositor interpolation.
  - `Cinematic`: more visual load, only for stronger devices.
  - auto-downgrade if the browser shows repeated slow frames.

## Next blocker
If the user still sees stutter in Advanced on the real browser, the next pass should prototype a WebGL/Three.js brain renderer instead of pushing DOM cards further.
