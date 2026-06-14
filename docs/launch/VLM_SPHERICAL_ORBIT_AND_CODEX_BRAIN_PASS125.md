# Velmère PASS 125 — Spherical VLM Orbit + Codex AI Brain Import

## Purpose
The previous VLM brain still looked flat because the cards were placed on screen edges. PASS125 changes Advanced/Pro visual readout into a real spherical orbit approximation: cards move around a virtual planet/core and update with the 360 drag/auto-rotation loop.

## What changed
- Imported the new Codex AI risk brain into `lib/market-integrity/risk-engine.ts`.
- Saved the Codex session and imported file under `docs/codex-handoff/import-audit`.
- Added `pro` to VLM sequence modes.
- Pro Review now opens a live VLM sequence instead of navigating away.
- Pro uses a 14-tile investigation preview.
- Advanced uses the full 20-tile investigation orbit.
- Removed the big tile search/filter cockpit from the VLM overlay because it obstructed the orbit.
- Added compact `360 orbit` status instead.
- Reworked tile placement into a spherical orbit with yaw/pitch/depth/scale/opacity.
- Added visible chart pan controls to the popup chart: older/newer/latest.
- Kept drag-to-pan on the chart.
- Updated VLM performance/preflight guards to PASS125 markers.

## Important limitation
This is still CSS/canvas 3D, not a real Three.js/WebGL mesh. It is much closer to a 360 orbit, but a true full 3D model would require a separate WebGL component and more QA time.

## QA notes
Check on desktop:
- Basic opens 10 tiles.
- Pro opens 14 tiles.
- Advanced opens 20 tiles.
- Dragging the VLM core rotates the card orbit.
- Cards should not be hidden by the old search cockpit.
- Chart can be dragged left/right and buttons older/newer/latest work.

Check on mobile:
- Low/compact mode should still fall back to safer rail layout.
- No card overlap should block close/back buttons.
