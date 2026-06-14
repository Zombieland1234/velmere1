# Velmère PASS151 — VLM Smooth Orbit + Vercel Codex Repair

## Main fixes

- Added `scripts/repair-codex-handoff.mjs` and wired it into `npm run build` before `vercel:preflight`.
- Root `CODEX_*.ts/js/tsx/jsx/mjs/cjs` artifacts are now moved automatically to `docs/codex-handoff/*.txt` before Vercel preflight.
- Added `.gitignore` protection so Codex handoff source files are not accidentally committed from the project root.
- VLM risk tiles are now clickable in Basic, Pro and Advanced, not only Advanced.
- Added lightweight DOM VLM core so the user still sees a central VLM token/brain even when heavy canvas is disabled by the runtime governor.
- Removed visual clutter from the top controls by hiding motion/runtime governor controls and orbit status from the user-facing overlay.
- Slowed orbit updates and moved the Advanced card animation toward compositor-friendly transitions.
- Reduced expensive blur/drop-shadow/backdrop-filter effects from VLM risk cards.
- Clipped card backgrounds and scan effects so cyan/gold/red glow does not spill outside the tile body.
- Added organic tile offsets so the orbit feels less perfectly flat/even while staying clamped inside the screen.

## Validation run

Passed:

- `npm run repair:codex-handoff`
- `npm run check:i18n`
- `npm run vercel:preflight`
- `npm run verify:shield-all`

Not claimed:

- Full `next build` was not run locally because this artifact folder has no `node_modules` installed in the sandbox.
