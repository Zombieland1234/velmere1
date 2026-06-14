# PASS1989 — clean one-layer asset popup

User target: the asset click modal must stop looking like many stacked windows/rings. It should show one clean popup with asset identity, separate price/risk/confidence tiles, three Basic/Pro/Advanced action cards near the top, one large chart, and the contained VLM Brain when an analysis tier is clicked.

## Implemented

- Reworked `UnifiedAssetModalShell` so Shield and Real Markets share the same simplified modal layout.
- Moved Basic / Pro / Advanced from the right-side nested rail into a top action row next to the Price / Risk / Confidence tiles.
- Converted the chart stage into one full-width chart-only panel; no empty depth column remains.
- Hid the old Sources / gaps / next-step details tray from the public asset popup so it no longer creates an extra visible window under the chart.
- Added PASS1989 CSS overrides that suppress old pseudo-elements, stacked rings, extra borders, nested shadows and multi-window visual noise.
- Kept the contained VLM Brain overlay inside the same asset modal when a tier is selected.
- Added a dedicated verifier for the clean asset modal contract.

## Verification

- `node scripts/verify-pass1989-clean-asset-modal-audit.mjs` — OK, 14/14
- `node scripts/verify-pass1988-list-continuation-audit.mjs` — OK, 13/13
- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK

Full Next build was not run because this ZIP does not include `node_modules`.
