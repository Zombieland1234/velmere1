# VELMERE PASS 94 — Interactive 360 Brain / calmer motion

Base: PASS 93

## Main fixes
- VLM neural brain is now interactive: drag to rotate the core in 360°.
- Added pointer-driven rotation with inertia and slow auto-drift.
- Reduced neural clutter:
  - fewer 3D brain nodes,
  - fewer transmission packets,
  - slower packet speed,
  - fewer orb trail particles,
  - slower background grid drift.
- Slowed pacing:
  - slower orb inbound,
  - slower brain forming,
  - slower readout line reveal.
- Reduced SVG flow clutter in Advanced mode.
- Added UX hint in topbar: drag the core to rotate the brain 360°.
- Added cursor/touch-action polish for desktop/mobile interaction.

## Validation
- node scripts/check-i18n.mjs
- node scripts/vercel-preflight.mjs
- node scripts/verify-market-integrity-no-truncation.mjs
- node scripts/verify-shield-design-safety.mjs
