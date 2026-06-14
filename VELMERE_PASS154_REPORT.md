# Velmère PASS154 — Shield hard containment + localized VLM readout polish

## Fixed
- Strengthened paint containment for Shield Map and token modal panels so decorative glows cannot bleed outside rounded frames.
- Reworked Basic/Pro static cards into a premium right-side evidence rail with better label/value hierarchy.
- Localized VLM tile labels and selected-tile explanatory copy for PL/DE/EN instead of leaking English-only details into Polish UI.
- Kept the evidence report export alias `buildEvidenceReportDraft` available for Vercel API routes.

## Verified
- `npm run check:i18n`
- `npm run repair:codex-handoff`
- `npm run vercel:preflight`
- `npm run verify:shield-all`
- `unzip -t`
