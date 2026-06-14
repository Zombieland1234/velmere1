# PASS2003 — Broad Lens + Audit aesthetic logic sweep

## Scope
- Velmère Lens / Browser PDF flow: modal depth choice, PDF forge, PDF preview, suggestion panel.
- Audit Watch public page: hero CTA density and major public audit cards.
- Global CSS: no-blur owned-scroll surfaces, calmer cyan focus/active states, compact audit utility CTA wall.

## Changes
1. Lens PDF depth dialog
   - Added `data-pass2003-lens-depth-dialog="solid-cyan-owned-scroll-no-blur"`.
   - Removed heavy `backdrop-blur-2xl` from the depth overlay.
   - Changed active depth cards from gold blocks to calm cyan active cards.
   - Added pointerdown backdrop close for faster close feel.

2. Lens PDF forge dialog
   - Added `data-pass2003-lens-forge-dialog="solid-low-lag-no-blur"`.
   - Removed heavy blur from forge overlay.
   - Changed progress rail to cyan with shorter transition for lower perceived lag.
   - Kept Velmère `V` identity but reduced surrounding gold dominance in controls.

3. Lens PDF preview dialog
   - Added `data-pass2003-lens-preview-dialog="solid-reader-owned-scroll-no-blur"`.
   - Removed preview root backdrop blur.
   - Added CSS no-blur/solid header lock and owned scroll behavior for PDF iframe + reader view.
   - Close button now supports pointerdown close.

4. Lens suggestion panel
   - Removed blur from the pinned suggestion panel.
   - Kept the panel solid/dark to avoid floating glass noise over scroll.

5. Audit Watch page
   - Added `data-pass2003-audit-page-sweep="calm-cta-density-solid-cards"`.
   - Added compact CTA density marker: `two-primary-compact-utilities-no-button-wall`.
   - Converted key audit sections to solid dark cards instead of gold-heavy blocks:
     - benchmark preview,
     - export preview,
     - intake section.
   - CSS makes only primary actions visually dominant and compresses secondary utility links.

## Verification
- `npm run verify:pass2003-broad-lens-audit-sweep` → OK 14/14
- `npm run verify:pass2002-broad-commerce-nav-wallet-sweep` → OK 12/12
- `npm run verify:pass2001-broad-visual-logic-square-sweep` → OK 10/10
- `npm run verify:pass2000-aesthetic-logic-final-live-lock` → OK 12/12
- `npm run verify:pass1934-1973-runtime-click-proof` → OK 20/20
- `npm run check:i18n` → OK
- `npm run vercel:preflight` → OK

## Notes
Full `next build` was not executed in this zip workspace because dependencies/node_modules are not included. Run `npm install` first in the real repo, then `npm run build`.
