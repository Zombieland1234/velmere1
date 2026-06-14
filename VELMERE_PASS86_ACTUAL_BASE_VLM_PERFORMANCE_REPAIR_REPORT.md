# VELMERE PASS 86 — ACTUAL PASS85 BASE / VLM PERFORMANCE REPAIR

This pass was applied to the user-provided `velmere_pass85_worldclass_vlm_neural_readout(1).zip` base, not to the older bare project.

## Modified files

- `components/market-integrity/TokenRiskModal.tsx`
- `app/globals.css`
- `VELMERE_PASS86_ACTUAL_BASE_VLM_PERFORMANCE_REPAIR_REPORT.md`

## What changed

### VLM neural readout

- Rebuilt the PASS85 `VlmAiSequenceOverlay` on the actual current modal.
- Basic still exposes 10 neural data points.
- Advanced still exposes 20 neural data points.
- Cards are now clickable and open a focused detail panel.
- Data still reveals step by step from the VLM core.
- Removed heavy SVG `animateMotion` packet loops and shifted active packet rendering into canvas.
- Added slower, more cinematic VLM entry path using a curved trajectory instead of linear motion.
- Added VLM core morphing behavior: after entry, the orb begins drawing internal neural/brain-like paths.
- Added explicit RISK text under the core.

### Performance and mobile

- Added adaptive motion quality: high / medium / low.
- Quality responds to viewport width, reduced-motion preference, coarse pointer and hardware concurrency.
- Mobile/low-power mode uses lower DPR, fewer nodes, fewer particles and a scrollable readout rail.
- Capped canvas DPR to reduce GPU pressure.
- Throttled canvas frames on lower motion quality tiers.
- Removed per-frame random particle sizing.
- Animation now stops cleanly on unmount/close and respects document visibility.
- Reduced pseudo-element background animation cost on compact mode.

### UX

- `Escape` now closes the VLM analysis overlay first; if no overlay is active, it closes the modal.
- Desktop still shows neural data cards around the core.
- Mobile shows a stable rail layout to prevent card overlap and lag.
- Data cards are focusable/clickable with detail copy explaining what each neural point means.

## Validation

Passed:

```bash
npm run check:i18n
npm run vercel:preflight
npm run verify:shield-all
```

`npm run typecheck` was attempted but the extracted archive does not include a complete installable dependency tree in this sandbox. It fails on missing module/type resolution for Next/React/lucide/next-intl and many unrelated existing files before it can provide a reliable project compile result.

## Notes

This pass is focused on repairing the real PASS85 base: less lag, better mobile behavior, more professional VLM motion, and clickable neural data points. Next pass should continue with Shield Map architecture and VLM/Basic/Pro product cohesion.
