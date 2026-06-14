# PASS288 — Orbit Scroll + PDF Forge Gate

## Scope

- D07 Tile detail popup: Orbit 360 clicked tile drawer now exits from the right edge and keeps its own scroll container.
- D20/J04 portal layering and scroll lock: right-edge portal stops wheel/touch propagation and keeps body scroll locked without blocking drawer scroll.
- M06 Report download route: VLM Lens now has a branded Velmère Cybersecurity PDF preview packet generator.
- M02/M03 Lens report/evidence note: PDF forge consumes Lens preview + Evidence Note gates before creating a local branded preview file.

## UX direction

- MEXC-style lesson: market context stays close to the decision surface.
- LVMH/Aura-style lesson: premium proof is quiet, traceable, redacted and signed; no noisy urgency.

## Product delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| D07 | Tile detail popup | 96 | 98 | +2 |
| D20 | Brain portal layering / scroll lock | 95 | 97 | +2 |
| J04 | Scroll lock / z-index layers | 97 | 98 | +1 |
| M06 | Report download route | 41 | 49 | +8 |
| M02 | Lens report preview | 86 | 88 | +2 |
| M03 | Evidence Note | 73 | 75 | +2 |
| E02 | Lens search UX | 87 | 89 | +2 |

PASS288 total: +19 points.
Tracker since PASS267: +373 points.

## Safety boundary

The PDF is a branded preview packet, not a certificate, investment recommendation, guarantee, legal opinion or final customer report. Missing sources, privacy redaction gaps and retention gaps keep public export frozen.

## Commands

```bash
npm run verify:pass288-orbit-scroll-pdf-forge
npm run verify:pass287-evidence-note-integrity-gate
npm run verify:pass286-lens-report-preview-gate
npm run check:i18n
npm run vercel:preflight
```

<!-- PASS288 marker: Orbit right-edge scroll + VLM PDF forge active. -->
