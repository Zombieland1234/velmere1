# Velmere PASS160 — Operator Cockpit Layout

## Implemented
- VLM sequence now uses a stable operator cockpit: left evidence rail, center VLM neural core, right detail drawer.
- Advanced keeps the 360/orbital shell while still using the clean left rail instead of random floating tables.
- Basic and Pro reuse the same visual language with fewer signals, so the three analysis modes feel like one system.
- Right-side detail drawer stays separate and can be closed by clicking outside.
- Mode guide remains a side drawer instead of expanding downward.
- Table sort uses tri-state behavior from PASS159 and stays in this package.
- Search suggestions include stronger logo fallbacks for BTC/ETH/SOL and other common assets.
- Extra containment added for chart/modal/map glow and pseudo-elements.

## Main target layout
- Left: signal tiles / filters / evidence cards.
- Center: VLM neural core + advanced 360 shell.
- Right: selected tile explanation drawer.

## Still to improve
- Add fully localized long-form explanations for every tile category.
- Add more token-logo mappings and source-state badges.
- Replace CSS-only neural core with WebGL only if the current version still cannot hold FPS on weak machines.
