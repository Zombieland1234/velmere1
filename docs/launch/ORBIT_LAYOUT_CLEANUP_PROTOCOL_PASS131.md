# Velmère PASS 131 — Orbit Layout Cleanup / Smooth Motion Protocol

## Purpose
The VLM brain must use the full viewport, avoid bottom overlays that hide cards, and move smoothly when auto-orbit is enabled.

## Changes
- Replaced the stepped orbit ticker with a requestAnimationFrame governor.
- Expanded spherical card placement vertically so tiles can reach near the top and bottom of the workspace.
- Reduced back-face blur cost and softened auto spin.
- Static mode now fills the main viewport instead of sitting as a short bottom rail.
- Selected tile details move to a right-side inspector on desktop instead of covering bottom tiles.
- Deep operator/evidence tools are hidden from the default right action panel so the panel ends cleanly after the main controls.
- Added PASS131 guard script and Vercel preflight checks.

## UX rule
Motion should feel premium and stable. A smooth 60fps-lite scene is better than a heavy fake 3D animation that stutters.

## Still not solved
This is still CSS/canvas, not a true WebGL/Three.js 3D scene. A real 3D planet/orbit model should be a separate component pass.
