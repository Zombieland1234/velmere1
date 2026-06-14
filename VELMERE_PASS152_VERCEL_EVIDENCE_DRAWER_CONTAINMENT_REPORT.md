# PASS152 — Vercel Evidence Export Fix + Shield Drawer Containment

## Fixed Vercel build blocker
- Added `buildEvidenceReportDraft` alias in `lib/market-integrity/evidence-report.ts` for legacy API routes.
- Added `EvidenceReportDraft` type alias for snapshot/export modules.
- Added `markdown`, `title`, `subtitle`, `warning`, `blockedBy` to the evidence draft so API routes and Shield Map UI read one stable shape.
- Added source ledger `body` compatibility field.

## UI polish
- Analysis buttons now have adjacent `?` guide buttons for Basic / Pro / Advanced.
- Each guide explains what the mode does and states clearly that VLM is an analysis summary tool, not a certificate, legal proof or financial advice.
- Basic/Pro/Advanced cards slide from the side with staggered timing.
- Selected tile detail opens as a solid right-side drawer.
- Clicking outside the drawer closes it.
- Top-left technical readout and motion runtime controls are hidden from the user-facing sequence.

## Shield containment
- Added hard containment around Shield cards, chart, action panel, evidence sections and selected tile drawer.
- Reduced outer glow/shadows so colors stay inside frames instead of bleeding beyond borders.
- Added CSS support for `missing`, `ready`, `review`, `blocked` evidence states.

## Verified locally
- `npm run check:i18n`
- `npm run repair:codex-handoff`
- `npm run vercel:preflight`
- `npm run verify:shield-all`

Full `next build` still requires Vercel/npm dependency install environment.
